import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/redis';
import { updateReferralSchema } from '@/lib/validations';
import { calculateRiskScore } from '@/services/risk_scoring_service';

// GET /api/referrals/[id] - Get a single referral
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: referral, error } = await supabase
      .from('referrals')
      .select(
        `
        *,
        patient:profiles!referrals_patient_id_fkey(id, full_name, email, phone, city, state, consent_preferences),
        doctor:profiles!referrals_doctor_id_fkey(id, full_name, email),
        booking:bookings(*),
        tasks:staff_scheduling_tasks(*)
      `
      )
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Referral not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // RLS should handle access control, but double-check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Additional authorization check
    if (profile.role === 'doctor' && referral.doctor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (profile.role === 'patient' && referral.patient_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: referral });
  } catch (error) {
    console.error('Get referral error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/referrals/[id] - Update a referral
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(`referrals:update:${user.id}`, 30, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateReferralSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Get existing referral
    const { data: existingReferral, error: fetchError } = await supabase
      .from('referrals')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existingReferral) {
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      );
    }

    // Check authorization
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Authorization based on role
    if (
      profile.role === 'doctor' &&
      existingReferral.doctor_id !== user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (
      profile.role === 'patient' &&
      existingReferral.patient_id !== user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Track status change
    const statusChanged = updateData.status && updateData.status !== existingReferral.status;

    // Update referral
    const { data: updatedReferral, error: updateError } = await supabase
      .from('referrals')
      .update({
        ...updateData,
        last_updated_by: user.id,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Recalculate risk score if relevant fields changed
    const riskRelevantFields = [
      'insurances',
      'insurance_type',
      'prior_auth_required',
      'prior_auth_status',
      'eligibility_status',
      'network_status',
      'patient_responsibility_estimate',
      'urgency_level',
    ];

    const needsRiskRecalc = riskRelevantFields.some(
      (field) => field in updateData
    );

    if (needsRiskRecalc) {
      const riskResult = calculateRiskScore(updatedReferral);

      await supabase
        .from('referrals')
        .update({
          risk_score: riskResult.risk_score,
          risk_level: riskResult.risk_level,
          risk_factors: riskResult.risk_factors,
          follow_up_due_at: riskResult.follow_up_due_at.toISOString(),
        })
        .eq('id', params.id);
    }

    // Log status change
    if (statusChanged) {
      await supabase.from('referral_metrics').insert({
        referral_id: params.id,
        event_type: 'STATUS_CHANGED',
        event_data: {
          from: existingReferral.status,
          to: updateData.status,
        },
        actor_id: user.id,
        actor_role: profile.role,
      });

      // Create audit log
      await supabase.from('audit_log').insert({
        table_name: 'referrals',
        record_id: params.id,
        action: 'UPDATE',
        old_values: { status: existingReferral.status },
        new_values: { status: updateData.status },
        changed_fields: ['status'],
        actor_id: user.id,
      });
    }

    return NextResponse.json({ data: updatedReferral });
  } catch (error) {
    console.error('Update referral error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
