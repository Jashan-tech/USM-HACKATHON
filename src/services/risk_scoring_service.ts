// =============================================================================
// NEXUS HEALTH - Risk Scoring Service
// Transparent rule-based risk scoring engine
// =============================================================================

import { Referral, RiskLevel, RiskFactors, InsuranceType } from '@/types';
import { addDays } from '@/lib/utils';

// =============================================================================
// RISK FACTOR WEIGHTS
// =============================================================================

const INSURANCE_TYPE_WEIGHTS: Record<string, number> = {
  MEDICAID: parseFloat(process.env.RISK_FACTOR_MEDICAID || '0.20'),
  SELF_PAY: parseFloat(process.env.RISK_FACTOR_SELF_PAY || '0.25'),
  MEDICARE_ADVANTAGE: parseFloat(process.env.RISK_FACTOR_MEDICARE_ADVANTAGE || '0.12'),
  MEDICARE: parseFloat(process.env.RISK_FACTOR_MEDICARE || '0.10'),
  COMMERCIAL: parseFloat(process.env.RISK_FACTOR_COMMERCIAL || '0.05'),
  OTHER: parseFloat(process.env.RISK_FACTOR_OTHER || '0.15'),
};

const DAYS_SINCE_CREATION_WEIGHTS = [
  { days: 14, weight: parseFloat(process.env.RISK_FACTOR_DAYS_14 || '0.35') },
  { days: 10, weight: parseFloat(process.env.RISK_FACTOR_DAYS_10 || '0.25') },
  { days: 5, weight: parseFloat(process.env.RISK_FACTOR_DAYS_5 || '0.15') },
  { days: 2, weight: parseFloat(process.env.RISK_FACTOR_DAYS_2 || '0.10') },
];

// =============================================================================
// RISK LEVEL THRESHOLDS
// =============================================================================

const RISK_THRESHOLDS: { min: number; level: RiskLevel }[] = [
  { min: parseFloat(process.env.RISK_THRESHOLD_CRITICAL || '0.70'), level: 'CRITICAL' },
  { min: parseFloat(process.env.RISK_THRESHOLD_HIGH || '0.50'), level: 'HIGH' },
  { min: parseFloat(process.env.RISK_THRESHOLD_MEDIUM || '0.30'), level: 'MEDIUM' },
  { min: parseFloat(process.env.RISK_THRESHOLD_LOW || '0.00'), level: 'LOW' },
];

// =============================================================================
// FOLLOW-UP TIMING (days)
// =============================================================================

export const FOLLOW_UP_DAYS: Record<RiskLevel, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 5,
  LOW: 10,
};

// =============================================================================
// MAIN RISK CALCULATION FUNCTION
// =============================================================================

export interface RiskCalculationResult {
  risk_score: number;
  risk_level: RiskLevel;
  risk_factors: RiskFactors;
  follow_up_due_at: Date;
  recommended_actions: string[];
}

/**
 * Calculate risk score for a referral
 * Uses transparent, rule-based scoring
 */
export function calculateRiskScore(referral: Referral): RiskCalculationResult {
  // Validate input parameters to prevent unexpected behavior
  if (!referral || !referral.created_at) {
    throw new Error('Invalid referral object: missing required fields');
  }

  // Validate dates to prevent NaN calculations
  const createdAtDate = new Date(referral.created_at);
  if (isNaN(createdAtDate.getTime())) {
    throw new Error('Invalid created_at date in referral object');
  }

  const factors: RiskFactors = {};
  let totalScore = 0;

  // 1. Telehealth flag (+0.15)
  if (referral.telehealth_flag) {
    factors.telehealth = 0.15;
    totalScore += 0.15;
  }

  // 2. Insurance type penalty
  const insuranceType = getEffectiveInsuranceType(referral);
  if (insuranceType) {
    const weight = INSURANCE_TYPE_WEIGHTS[insuranceType] || 0.10;
    factors.insurance_type = weight;
    totalScore += weight;
  }

  // 3. Prior auth pending (+0.20)
  if (referral.prior_auth_required && referral.prior_auth_status === 'PENDING') {
    factors.prior_auth_pending = 0.20;
    totalScore += 0.20;
  }

  // 4. Days since creation without booking
  const daysSinceCreation = getDaysSinceCreation(referral);
  const daysWeight = getDaysWeight(daysSinceCreation);
  if (daysWeight > 0) {
    factors.days_since_creation = daysWeight;
    totalScore += daysWeight;
  }

  // 5. Eligibility issues (+0.15)
  if (
    referral.eligibility_status === 'INACTIVE' ||
    referral.network_status === 'OUT_OF_NETWORK'
  ) {
    factors.eligibility_issues = 0.15;
    totalScore += 0.15;
  }

  // 6. High patient responsibility (>$500) (+0.10)
  if (referral.patient_responsibility_estimate && referral.patient_responsibility_estimate > 500) {
    factors.high_cost = 0.10;
    totalScore += 0.10;
  }

  // 7. STAT urgency (+0.15)
  if (referral.urgency_level === 'STAT') {
    factors.urgency = 0.15;
    totalScore += 0.15;
  }

  // 8. Hospice STAT combination (+0.50)
  if (referral.urgency_level === 'STAT' && referral.referral_category === 'HOSPICE') {
    factors.hospice_stat = 0.50;
    totalScore += 0.50;
  }

  // 9. Self-pay with high cost (+0.30)
  if (insuranceType === 'SELF_PAY' && referral.patient_responsibility_estimate &&
    referral.patient_responsibility_estimate > 300) {
    factors.self_pay = 0.30;
    totalScore += 0.30;
  }

  // 10. Out-of-network specialist selected (+0.25)
  if (referral.network_status === 'OUT_OF_NETWORK' && referral.selected_specialist_npi) {
    factors.out_of_network = 0.25;
    totalScore += 0.25;
  }

  // 11. Expired coverage (+0.35)
  if (hasExpiredCoverage(referral)) {
    factors.expired_coverage = 0.35;
    totalScore += 0.35;
  }

  // Cap at 1.0 to ensure risk score is within valid range
  const risk_score = Math.min(1.0, Math.max(0, totalScore));

  // Validate the calculated risk score is within expected bounds
  if (risk_score < 0 || risk_score > 1.0) {
    console.warn(`Calculated risk score out of bounds: ${risk_score}. Capping to valid range [0, 1].`);
  }

  // Determine risk level
  const risk_level = getRiskLevel(risk_score);

  // Calculate follow-up due date
  const follow_up_due_at = addDays(new Date(), FOLLOW_UP_DAYS[risk_level]);

  // Generate recommended actions
  const recommended_actions = generateRecommendedActions(referral, factors, risk_level);

  return {
    risk_score: Math.round(risk_score * 100) / 100,
    risk_level,
    risk_factors: factors,
    follow_up_due_at,
    recommended_actions,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getEffectiveInsuranceType(referral: Referral): InsuranceType | null {
  // Check insurances array first
  if (referral.insurances && referral.insurances.length > 0) {
    const primary = referral.insurances.find((i) => i.priority === 'PRIMARY');
    if (primary?.plan_type) {
      return mapPlanTypeToInsuranceType(primary.plan_type);
    }
  }
  // Fall back to legacy field
  return referral.insurance_type || null;
}

function mapPlanTypeToInsuranceType(planType: string): InsuranceType {
  const type = planType.toUpperCase();
  if (type.includes('MEDICAID')) return 'MEDICAID';
  if (type.includes('MEDICARE_ADV') || type.includes('ADVANTAGE')) return 'MEDICARE_ADVANTAGE';
  if (type.includes('MEDICARE')) return 'MEDICARE';
  if (type === 'SELF_PAY' || type === 'SELF PAY') return 'SELF_PAY';
  if (['PPO', 'HMO', 'EPO', 'POS'].includes(type)) return 'COMMERCIAL';
  return 'OTHER';
}

function getDaysSinceCreation(referral: Referral): number {
  const created = new Date(referral.created_at);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function getDaysWeight(days: number): number {
  for (const tier of DAYS_SINCE_CREATION_WEIGHTS) {
    if (days >= tier.days) {
      return tier.weight;
    }
  }
  return 0;
}

export function getRiskLevel(score: number): RiskLevel {
  for (const threshold of RISK_THRESHOLDS) {
    if (score >= threshold.min) {
      return threshold.level;
    }
  }
  return 'LOW';
}

function hasExpiredCoverage(referral: Referral): boolean {
  // Check insurances array
  if (referral.insurances && referral.insurances.length > 0) {
    for (const insurance of referral.insurances) {
      if (insurance.coverage_end_date) {
        const endDate = new Date(insurance.coverage_end_date);
        if (endDate < new Date()) {
          return true;
        }
      }
    }
  }
  // Check legacy field
  if (referral.coverage_end_date) {
    const endDate = new Date(referral.coverage_end_date);
    return endDate < new Date();
  }
  return false;
}

// =============================================================================
// RECOMMENDED ACTIONS GENERATOR
// =============================================================================

function generateRecommendedActions(
  referral: Referral,
  factors: RiskFactors,
  riskLevel: RiskLevel
): string[] {
  const actions: string[] = [];

  // Prior auth pending
  if (factors.prior_auth_pending) {
    actions.push('Expedite prior authorization submission');
  }

  // Eligibility issues
  if (factors.eligibility_issues) {
    if (referral.network_status === 'OUT_OF_NETWORK') {
      actions.push('Find in-network specialist alternative');
    }
    if (referral.eligibility_status === 'INACTIVE') {
      actions.push('Verify current insurance coverage with patient');
    }
  }

  // High days without booking
  if (factors.days_since_creation && factors.days_since_creation >= 0.25) {
    actions.push('Immediate patient outreach required');
  }

  // High cost sharing
  if (factors.high_cost) {
    actions.push('Discuss financial assistance options with patient');
  }

  // Self-pay
  if (factors.self_pay) {
    actions.push('Explore sliding scale or payment plan options');
    actions.push('Check charity care eligibility');
  }

  // Expired coverage
  if (factors.expired_coverage) {
    actions.push('Verify if patient has new insurance coverage');
    actions.push('Explore marketplace or Medicaid eligibility');
  }

  // Hospice STAT
  if (factors.hospice_stat) {
    actions.push('PRIORITY: Route to intake nurse immediately');
    actions.push('Complete hospice documentation checklist within 24 hours');
  }

  // Critical level escalation
  if (riskLevel === 'CRITICAL') {
    actions.push('Escalate to care coordinator for immediate review');
  }

  return actions;
}

// =============================================================================
// RISK ESCALATION LOGIC
// =============================================================================

/**
 * Check if risk should be escalated based on time
 */
export function shouldEscalateRisk(referral: Referral): boolean {
  const daysSinceCreation = getDaysSinceCreation(referral);

  switch (referral.risk_level) {
    case 'LOW':
      return daysSinceCreation >= 10;
    case 'MEDIUM':
      return daysSinceCreation >= 7;
    case 'HIGH':
      return daysSinceCreation >= 5;
    default:
      return false;
  }
}

/**
 * Get escalated risk level
 */
export function getEscalatedRiskLevel(currentLevel: RiskLevel): RiskLevel {
  switch (currentLevel) {
    case 'LOW':
      return 'MEDIUM';
    case 'MEDIUM':
      return 'HIGH';
    case 'HIGH':
      return 'CRITICAL';
    default:
      return 'CRITICAL';
  }
}
