import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/redis';
import {
  checkEligibility,
  checkPriorAuthRequired,
  getPayerAuthInfo,
  determinePayerOrder,
} from '@/services/insurance_verification_service';
import { z } from 'zod';

// Validation schema for eligibility check request
const eligibilityCheckSchema = z.object({
  referral_id: z.string().uuid(),
});

/**
 * POST /api/eligibility
 * Trigger eligibility check for a referral
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(`eligibility:${user.id}`, 20, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validation = eligibilityCheckSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { referral_id } = validation.data;

    // Fetch referral with insurance data
    const { data: referral, error: fetchError } = await supabase
      .from('referrals')
      .select('*')
      .eq('id', referral_id)
      .single();

    if (fetchError || !referral) {
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this referral
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const canAccess =
      profile?.role === 'staff' ||
      referral.doctor_id === user.id ||
      referral.patient_id === user.id;

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update status to checking
    await supabase
      .from('referrals')
      .update({ status: 'ELIGIBILITY_CHECKING' })
      .eq('id', referral_id);

    // Get insurance info (prefer insurances array, fall back to legacy fields)
    const insurances = referral.insurances || [];
    const { primary, secondary } = determinePayerOrder(insurances);

    // Determine effective insurance
    const effectiveInsurance = primary || {
      payer_id: referral.payer_id,
      member_id: referral.member_id,
      plan_type: referral.plan_type || referral.insurance_type,
    };

    if (!effectiveInsurance.payer_id || !effectiveInsurance.member_id) {
      // Create staff task for manual verification
      await supabase.from('staff_scheduling_tasks').insert({
        referral_id,
        task_type: 'MANUAL_ELIGIBILITY_CHECK',
        priority: 'HIGH',
        status: 'PENDING',
        instructions: 'Missing insurance information. Please verify eligibility manually via payer portal or phone.',
        required_fields: { payer_id: true, member_id: true },
      });

      await supabase
        .from('referrals')
        .update({
          status: 'ELIGIBILITY_FAILED',
          eligibility_status: 'ERROR',
          eligibility_checked_at: new Date().toISOString(),
        })
        .eq('id', referral_id);

      return NextResponse.json({
        success: false,
        error: 'Missing insurance information',
        task_created: true,
      });
    }

    // Map plan_type to InsuranceType
    const insuranceType = mapToInsuranceType(effectiveInsurance.plan_type);

    // Perform eligibility check
    const eligibilityResult = await checkEligibility({
      payer_id: effectiveInsurance.payer_id,
      member_id: effectiveInsurance.member_id,
      insurance_type: insuranceType,
      service_codes: referral.requested_service_codes || [],
      diagnosis_codes: referral.diagnosis_codes || [],
    });

    // Determine new status based on result
    let newStatus = referral.status;
    if (eligibilityResult.status === 'ACTIVE' && eligibilityResult.coverage_active) {
      newStatus = eligibilityResult.prior_auth_required
        ? 'PRIOR_AUTH_REQUIRED'
        : 'ELIGIBILITY_CONFIRMED';
    } else if (eligibilityResult.status === 'INACTIVE') {
      newStatus = 'ELIGIBILITY_FAILED';
    }

    // Update referral with eligibility results
    const updateData: Record<string, unknown> = {
      status: newStatus,
      eligibility_checked_at: new Date().toISOString(),
      eligibility_status: eligibilityResult.status,
      eligibility_response: eligibilityResult,
      network_status: eligibilityResult.network_status,
      patient_responsibility_estimate: eligibilityResult.patient_responsibility_estimate,
      prior_auth_required: eligibilityResult.prior_auth_required,
      last_updated_by: user.id,
    };

    await supabase.from('referrals').update(updateData).eq('id', referral_id);

    // Log metric event
    await supabase.from('referral_metrics').insert({
      referral_id,
      event_type: 'ELIGIBILITY_CHECKED',
      event_data: {
        status: eligibilityResult.status,
        network_status: eligibilityResult.network_status,
        prior_auth_required: eligibilityResult.prior_auth_required,
      },
      actor_id: user.id,
      actor_role: profile?.role,
    });

    // If prior auth required, create staff task
    if (eligibilityResult.prior_auth_required) {
      const payerInfo = getPayerAuthInfo(effectiveInsurance.payer_id);

      await supabase.from('staff_scheduling_tasks').insert({
        referral_id,
        task_type: 'SUBMIT_PRIOR_AUTH',
        priority: 'HIGH',
        status: 'PENDING',
        instructions: `Prior authorization required. Submit via ${payerInfo?.portal_url || 'payer portal'} or call ${payerInfo?.phone || 'payer phone line'}.`,
        required_fields: {
          service_codes: referral.requested_service_codes,
          diagnosis_codes: referral.diagnosis_codes,
        },
      });
    }

    // If eligibility failed, create staff task for manual review
    if (newStatus === 'ELIGIBILITY_FAILED') {
      await supabase.from('staff_scheduling_tasks').insert({
        referral_id,
        task_type: 'MANUAL_ELIGIBILITY_CHECK',
        priority: 'CRITICAL',
        status: 'PENDING',
        instructions: 'Automated eligibility check failed. Please verify coverage status manually.',
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        eligibility_status: eligibilityResult.status,
        network_status: eligibilityResult.network_status,
        coverage_active: eligibilityResult.coverage_active,
        prior_auth_required: eligibilityResult.prior_auth_required,
        patient_responsibility: eligibilityResult.patient_responsibility_estimate,
        benefits: eligibilityResult.benefits,
        new_status: newStatus,
      },
    });
  } catch (error) {
    console.error('Eligibility check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Map plan type string to InsuranceType enum
 */
function mapToInsuranceType(planType: string | null | undefined): 'COMMERCIAL' | 'MEDICARE' | 'MEDICARE_ADVANTAGE' | 'MEDICAID' | 'SELF_PAY' | 'OTHER' {
  if (!planType) return 'COMMERCIAL';
  
  const normalized = planType.toUpperCase();
  
  if (normalized.includes('MEDICAID')) return 'MEDICAID';
  if (normalized.includes('MEDICARE_ADV') || normalized.includes('MA')) return 'MEDICARE_ADVANTAGE';
  if (normalized.includes('MEDICARE')) return 'MEDICARE';
  if (normalized.includes('SELF') || normalized.includes('UNINSURED')) return 'SELF_PAY';
  if (normalized.includes('COMMERCIAL') || normalized.includes('PPO') || normalized.includes('HMO')) return 'COMMERCIAL';
  
  return 'OTHER';
}
