import { calculateRiskScore, getRiskLevel } from '@/services/risk_scoring_service';
import { Referral, RiskLevel } from '@/types';

describe('Risk Scoring Service', () => {
    const createMockReferral = (overrides: Partial<Referral> = {}): Referral => ({
        id: 'test-id',
        patient_id: 'patient-id',
        doctor_id: 'doctor-id',
        specialist_type: 'Cardiology',
        status: 'CREATED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides,
    });

    describe('calculateRiskScore', () => {
        it('should calculate low risk for commercial insurance with no delays', () => {
            const referral = createMockReferral({
                insurance_type: 'COMMERCIAL',
                created_at: new Date().toISOString(), // Just created
            });

            const result = calculateRiskScore(referral);
            expect(result.risk_score).toBeLessThan(0.3);
            expect(result.risk_level).toBe('LOW');
        });

        it('should calculate high risk for self-pay with delays', () => {
            const eightDaysAgo = new Date();
            eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

            const referral = createMockReferral({
                insurance_type: 'SELF_PAY',
                created_at: eightDaysAgo.toISOString(),
            });

            const result = calculateRiskScore(referral);
            expect(result.risk_score).toBeGreaterThan(0.3);
            expect(result.risk_level).not.toBe('LOW');
        });

        it('should calculate critical risk for expired coverage', () => {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const expiredDate = new Date();
            expiredDate.setDate(expiredDate.getDate() - 1);

            const referral = createMockReferral({
                insurance_type: 'COMMERCIAL',
                created_at: sevenDaysAgo.toISOString(),
                coverage_end_date: expiredDate.toISOString(),
            });

            const result = calculateRiskScore(referral);
            expect(result.risk_score).toBeGreaterThan(0.5);
            expect(result.risk_factors.expired_coverage).toBeDefined();
        });

        it('should handle multiple risk factors additively', () => {
            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

            const referral = createMockReferral({
                insurance_type: 'MEDICAID',
                created_at: fiveDaysAgo.toISOString(),
                prior_auth_required: true,
                prior_auth_status: 'PENDING',
                network_status: 'OUT_OF_NETWORK',
                telehealth_flag: true,
            });

            const result = calculateRiskScore(referral);
            expect(result.risk_score).toBeGreaterThan(0.5);
            expect(Object.keys(result.risk_factors).length).toBeGreaterThan(2);
        });

        it('should generate recommended actions for high-risk referrals', () => {
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

            const referral = createMockReferral({
                insurance_type: 'SELF_PAY',
                created_at: tenDaysAgo.toISOString(),
                patient_responsibility_estimate: 600,
            });

            const result = calculateRiskScore(referral);
            expect(result.recommended_actions.length).toBeGreaterThan(0);
            expect(result.recommended_actions.some(a => a.includes('patient outreach'))).toBe(true);
        });
    });

    describe('getRiskLevel', () => {
        it('should return LOW for scores below 0.3', () => {
            expect(getRiskLevel(0.15)).toBe('LOW');
            expect(getRiskLevel(0.29)).toBe('LOW');
        });

        it('should return MEDIUM for scores 0.3-0.5', () => {
            expect(getRiskLevel(0.3)).toBe('MEDIUM');
            expect(getRiskLevel(0.45)).toBe('MEDIUM');
        });

        it('should return HIGH for scores 0.5-0.7', () => {
            expect(getRiskLevel(0.5)).toBe('HIGH');
            expect(getRiskLevel(0.65)).toBe('HIGH');
        });

        it('should return CRITICAL for scores above 0.7', () => {
            expect(getRiskLevel(0.7)).toBe('CRITICAL');
            expect(getRiskLevel(0.95)).toBe('CRITICAL');
        });
    });
});
