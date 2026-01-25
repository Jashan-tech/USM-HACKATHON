// =============================================================================
// REFREE - Insurance Verification Service
// Eligibility check and prior authorization logic
// =============================================================================

import {
  EligibilityStatus,
  NetworkStatus,
  InsuranceType,
  EligibilityCheckResponse,
  Insurance,
} from '@/types';

// =============================================================================
// PAYER RULES ENGINE
// Determines if prior auth is required based on service + payer
// =============================================================================

interface PayerRule {
  payer_ids: string[];
  requires_prior_auth_for: {
    service_codes: string[];
    service_categories: string[];
  };
  auth_portal_url?: string;
  phone?: string;
}

const PAYER_RULES: PayerRule[] = [
  {
    payer_ids: ['UHC', 'UNITEDHEALTHCARE'],
    requires_prior_auth_for: {
      service_codes: ['72148', '72149', '72156', '72157', '72158'], // MRI lumbar
      service_categories: ['MRI', 'CT', 'PET', 'SURGERY'],
    },
    auth_portal_url: 'https://www.uhcprovider.com',
    phone: '1-877-842-3210',
  },
  {
    payer_ids: ['AETNA'],
    requires_prior_auth_for: {
      service_codes: ['72148', '27447', '29881'], // MRI, knee replacement, arthroscopy
      service_categories: ['MRI', 'SURGERY', 'DME'],
    },
    auth_portal_url: 'https://www.aetna.com/providers',
    phone: '1-800-624-0756',
  },
  {
    payer_ids: ['CIGNA'],
    requires_prior_auth_for: {
      service_codes: ['72148', '27130', '27447'],
      service_categories: ['MRI', 'CT', 'SURGERY', 'INFUSION'],
    },
    auth_portal_url: 'https://www.cigna.com/providers',
    phone: '1-800-244-6224',
  },
  {
    payer_ids: ['BCBS', 'BCBS001', 'BLUECROSS'],
    requires_prior_auth_for: {
      service_codes: ['72148', '72156'],
      service_categories: ['SURGERY', 'TRANSPLANT'],
    },
    phone: '1-800-262-2583',
  },
  {
    payer_ids: ['MEDICARE'],
    requires_prior_auth_for: {
      service_codes: [], // Medicare rarely requires prior auth
      service_categories: ['DME', 'HHA', 'HOSPICE'],
    },
  },
];

// =============================================================================
// ELIGIBILITY CHECK (SIMULATED)
// In production, this would call Availity or Change Healthcare APIs
// =============================================================================

export interface EligibilityCheckParams {
  payer_id: string;
  member_id: string;
  insurance_type: InsuranceType;
  service_codes?: string[];
  diagnosis_codes?: string[];
}

/**
 * Simulate eligibility check (270/271 EDI transaction)
 * In production, integrate with Availity or Change Healthcare
 */
export async function checkEligibility(
  params: EligibilityCheckParams
): Promise<EligibilityCheckResponse> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Simulate different scenarios based on member_id patterns
  const memberId = params.member_id.toUpperCase();

  // Expired coverage pattern
  if (memberId.includes('EXPIRED') || memberId.includes('TERM')) {
    return {
      status: 'INACTIVE',
      network_status: 'UNKNOWN',
      coverage_active: false,
      checked_at: new Date().toISOString(),
      prior_auth_required: false,
      benefits: {
        termination_reason: 'COVERAGE_ENDED',
        termination_date: '2024-12-31',
      },
    };
  }

  // Out-of-network pattern
  if (memberId.includes('OON') || params.payer_id === 'AETNA') {
    const isInNetwork = Math.random() > 0.3; // 70% in-network
    return {
      status: 'ACTIVE',
      network_status: isInNetwork ? 'IN_NETWORK' : 'OUT_OF_NETWORK',
      coverage_active: true,
      patient_responsibility_estimate: isInNetwork ? 50 : 2500,
      checked_at: new Date().toISOString(),
      prior_auth_required: checkPriorAuthRequired(params.payer_id, params.service_codes || []),
      benefits: {
        deductible_met: true,
        out_of_pocket_max: 6500,
        copay_specialist: isInNetwork ? 40 : 100,
        coinsurance: isInNetwork ? 20 : 40,
      },
    };
  }

  // Medicaid pattern (usually active, low cost)
  if (params.insurance_type === 'MEDICAID') {
    return {
      status: 'ACTIVE',
      network_status: 'IN_NETWORK',
      coverage_active: true,
      patient_responsibility_estimate: 0,
      checked_at: new Date().toISOString(),
      prior_auth_required: checkPriorAuthRequired(params.payer_id, params.service_codes || []),
      benefits: {
        copay_specialist: 0,
        copay_primary: 0,
        covered_services: ['ALL'],
      },
    };
  }

  // Medicare pattern
  if (params.insurance_type === 'MEDICARE' || params.insurance_type === 'MEDICARE_ADVANTAGE') {
    return {
      status: 'ACTIVE',
      network_status: 'IN_NETWORK',
      coverage_active: true,
      patient_responsibility_estimate: 20,
      checked_at: new Date().toISOString(),
      prior_auth_required: params.insurance_type === 'MEDICARE_ADVANTAGE' &&
        checkPriorAuthRequired(params.payer_id, params.service_codes || []),
      benefits: {
        part_b_deductible_met: true,
        coinsurance: 20,
      },
    };
  }

  // Self-pay pattern
  if (params.insurance_type === 'SELF_PAY') {
    return {
      status: 'UNKNOWN',
      network_status: 'UNKNOWN',
      coverage_active: false,
      patient_responsibility_estimate: 850, // Full self-pay amount
      checked_at: new Date().toISOString(),
      prior_auth_required: false,
      benefits: {
        self_pay_discount_available: true,
        payment_plan_available: true,
      },
    };
  }

  // Default commercial insurance (active, in-network)
  return {
    status: 'ACTIVE',
    network_status: 'IN_NETWORK',
    coverage_active: true,
    patient_responsibility_estimate: 50,
    checked_at: new Date().toISOString(),
    prior_auth_required: checkPriorAuthRequired(params.payer_id, params.service_codes || []),
    benefits: {
      deductible_met: true,
      copay_specialist: 40,
      copay_primary: 25,
      coinsurance: 20,
    },
  };
}

// =============================================================================
// PRIOR AUTHORIZATION CHECK
// =============================================================================

/**
 * Check if prior authorization is required
 */
export function checkPriorAuthRequired(payerId: string, serviceCodes: string[]): boolean {
  const normalizedPayerId = payerId.toUpperCase();

  for (const rule of PAYER_RULES) {
    const matchesPayer = rule.payer_ids.some(
      (id) => normalizedPayerId.includes(id) || id.includes(normalizedPayerId)
    );

    if (matchesPayer) {
      // Check if any service code requires prior auth
      for (const code of serviceCodes) {
        if (rule.requires_prior_auth_for.service_codes.includes(code)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Get payer contact information for prior auth
 */
export function getPayerAuthInfo(payerId: string): { portal_url?: string; phone?: string } | null {
  const normalizedPayerId = payerId.toUpperCase();

  for (const rule of PAYER_RULES) {
    const matchesPayer = rule.payer_ids.some(
      (id) => normalizedPayerId.includes(id) || id.includes(normalizedPayerId)
    );

    if (matchesPayer) {
      return {
        portal_url: rule.auth_portal_url,
        phone: rule.phone,
      };
    }
  }

  return null;
}

// =============================================================================
// COORDINATION OF BENEFITS
// =============================================================================

/**
 * Determine primary and secondary payer for dual coverage
 */
export function determinePayerOrder(insurances: Insurance[]): {
  primary: Insurance | null;
  secondary: Insurance | null;
} {
  if (!insurances || insurances.length === 0) {
    return { primary: null, secondary: null };
  }

  const primary = insurances.find((i) => i.priority === 'PRIMARY') || insurances[0];
  const secondary = insurances.find((i) => i.priority === 'SECONDARY') || null;

  return { primary, secondary };
}

/**
 * Calculate combined patient responsibility for dual coverage
 */
export function calculateDualCoverageResponsibility(
  primaryResponse: EligibilityCheckResponse,
  secondaryResponse?: EligibilityCheckResponse
): number {
  if (!secondaryResponse || !secondaryResponse.coverage_active) {
    return primaryResponse.patient_responsibility_estimate || 0;
  }

  // Secondary typically covers remainder after primary
  const primaryResponsibility = primaryResponse.patient_responsibility_estimate || 0;

  // Simulate secondary coverage reducing patient responsibility
  // In reality, this depends on coordination of benefits rules
  const secondaryCoverage = Math.min(primaryResponsibility, primaryResponsibility * 0.8);

  return Math.max(0, primaryResponsibility - secondaryCoverage);
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate insurance information completeness
 */
export function validateInsuranceInfo(insurance: Partial<Insurance>): {
  valid: boolean;
  missing_fields: string[];
} {
  const requiredFields = ['payer_name', 'member_id'];
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (!insurance[field as keyof Insurance]) {
      missingFields.push(field);
    }
  }

  return {
    valid: missingFields.length === 0,
    missing_fields: missingFields,
  };
}

/**
 * Check if coverage is currently active
 */
export function isCoverageActive(insurance: Insurance): boolean {
  const now = new Date();

  if (insurance.coverage_end_date) {
    const endDate = new Date(insurance.coverage_end_date);
    if (endDate < now) {
      return false;
    }
  }

  if (insurance.coverage_start_date) {
    const startDate = new Date(insurance.coverage_start_date);
    if (startDate > now) {
      return false;
    }
  }

  return true;
}
