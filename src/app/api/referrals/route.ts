import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/redis';
import { createReferralSchema } from '@/lib/validations';
import { calculateRiskScore } from '@/services/risk_scoring_service';
import { z } from 'zod';

// GET /api/referrals - List referrals for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(`referrals:${user.id}`, 60, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Get user profile to determine role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Build query based on role
    let query = supabase
      .from('referrals')
      .select(
        `
        *,
        patient:profiles!referrals_patient_id_fkey(id, full_name, email, phone),
        doctor:profiles!referrals_doctor_id_fkey(id, full_name, email),
        booking:bookings(*)
      `
      )
      .order('created_at', { ascending: false });

    if (profile.role === 'doctor') {
      query = query.eq('doctor_id', user.id);
    } else if (profile.role === 'patient') {
      query = query.eq('patient_id', user.id);
    }
    // Staff can see all referrals (no filter needed)

    // Apply filters from query params
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const riskLevel = searchParams.get('risk');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (status) {
      query = query.eq('status', status);
    }
    if (riskLevel) {
      query = query.eq('risk_level', riskLevel);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: referrals, error } = await query;

    if (error) {
      console.error('Error fetching referrals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch referrals' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: referrals });
  } catch (error) {
    console.error('Referrals API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/referrals - Create a new referral
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a doctor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Only doctors can create referrals' },
        { status: 403 }
      );
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(`referrals:create:${user.id}`, 10, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before creating more referrals.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createReferralSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify patient exists
    const { data: patient } = await supabase
      .from('profiles')
      .select('id, city, state, consent_preferences')
      .eq('id', data.patient_id)
      .eq('role', 'patient')
      .single();

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Create referral
    const referralData = {
      ...data,
      doctor_id: user.id,
      city: data.city || patient.city,
      state: data.state || patient.state,
      patient_consent_preferences: patient.consent_preferences || {
        sms: false,
        email: false,
        voice: false,
      },
      status: 'CREATED',
      risk_level: 'MEDIUM',
      created_by: user.id,
    };

    const { data: referral, error } = await supabase
      .from('referrals')
      .insert(referralData)
      .select()
      .single();

    if (error) {
      console.error('Error creating referral:', error);
      return NextResponse.json(
        { error: 'Failed to create referral' },
        { status: 500 }
      );
    }

    // Calculate risk score
    const riskResult = calculateRiskScore(referral);

    // Update referral with risk score
    await supabase
      .from('referrals')
      .update({
        risk_score: riskResult.risk_score,
        risk_level: riskResult.risk_level,
        risk_factors: riskResult.risk_factors,
        follow_up_due_at: riskResult.follow_up_due_at.toISOString(),
      })
      .eq('id', referral.id);

    // Create metric event
    await supabase.from('referral_metrics').insert({
      referral_id: referral.id,
      event_type: 'CREATED',
      event_data: {
        specialist_type: data.specialist_type,
        urgency: data.urgency_level,
      },
      actor_id: user.id,
      actor_role: 'doctor',
    });

    // Check for fast-track (STAT + HOSPICE)
    if (
      data.urgency_level === 'STAT' &&
      data.referral_category === 'HOSPICE'
    ) {
      // Create urgent intake task
      await supabase.from('staff_scheduling_tasks').insert({
        referral_id: referral.id,
        task_type: 'HOSPICE_URGENT_INTAKE',
        priority: 'CRITICAL',
        status: 'PENDING',
        instructions: `STAT HOSPICE REFERRAL - Immediate intake required within 24 hours.`,
        required_documents: ['terminal_cert', 'physician_orders', 'dnr', 'advance_directive'],
        required_actions: [
          'Verify Medicare Hospice Benefit eligibility',
          'Obtain terminal certification',
          'Collect advance directives',
          'Schedule initial hospice visit',
        ],
        sla_hours: 24,
        sla_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      // Update risk to CRITICAL
      await supabase
        .from('referrals')
        .update({
          risk_level: 'CRITICAL',
          risk_score: 0.95,
          risk_factors: {
            hospice_stat: 0.5,
            terminal_diagnosis: 0.3,
            time_sensitive: 0.15,
          },
          follow_up_due_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', referral.id);

      // Log fast-track event
      await supabase.from('referral_metrics').insert({
        referral_id: referral.id,
        event_type: 'FAST_TRACK_TRIGGERED',
        event_data: { reason: 'STAT_HOSPICE', sla_hours: 24 },
      });
    }

    return NextResponse.json({ data: referral }, { status: 201 });
  } catch (error) {
    console.error('Create referral error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
