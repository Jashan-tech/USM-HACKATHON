import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/redis';
import { z } from 'zod';

// Validation schemas
const submitPriorAuthSchema = z.object({
    referral_id: z.string().uuid(),
    auth_number: z.string().optional(),
    notes: z.string().optional(),
});

const updatePriorAuthSchema = z.object({
    referral_id: z.string().uuid(),
    status: z.enum(['PENDING', 'APPROVED', 'DENIED', 'EXPIRED']),
    auth_number: z.string().optional(),
    expiration_date: z.string().optional(),
    denial_reason: z.string().optional(),
    // Manual verification fields
    verification_method: z.enum(['PHONE', 'PAYER_PORTAL', 'FAX', 'OTHER']).optional(),
    verification_reference: z.string().optional(),
    verification_agent_name: z.string().optional(),
    verification_notes: z.string().optional(),
});

/**
 * GET /api/prior-auth?referral_id=xxx
 * Get prior auth status for a referral
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const referralId = request.nextUrl.searchParams.get('referral_id');

        if (!referralId) {
            return NextResponse.json(
                { error: 'referral_id is required' },
                { status: 400 }
            );
        }

        // Fetch referral prior auth info
        const { data: referral, error } = await supabase
            .from('referrals')
            .select(`
        id,
        prior_auth_required,
        prior_auth_submitted_at,
        prior_auth_number,
        prior_auth_status,
        prior_auth_expiration_date,
        prior_auth_denial_reason,
        payer_name,
        payer_id
      `)
            .eq('id', referralId)
            .single();

        if (error || !referral) {
            return NextResponse.json(
                { error: 'Referral not found' },
                { status: 404 }
            );
        }

        // Get associated staff tasks for prior auth
        const { data: tasks } = await supabase
            .from('staff_scheduling_tasks')
            .select('*')
            .eq('referral_id', referralId)
            .eq('task_type', 'SUBMIT_PRIOR_AUTH')
            .order('created_at', { ascending: false });

        return NextResponse.json({
            data: {
                ...referral,
                tasks: tasks || [],
            },
        });
    } catch (error) {
        console.error('Get prior auth error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/prior-auth
 * Submit prior authorization for a referral
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

        // Verify user is staff or doctor
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || !['staff', 'doctor'].includes(profile.role)) {
            return NextResponse.json(
                { error: 'Only staff or doctors can submit prior auth' },
                { status: 403 }
            );
        }

        // Rate limiting
        const rateLimit = await checkRateLimit(`prior-auth:${user.id}`, 10, 60000);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded' },
                { status: 429 }
            );
        }

        // Parse and validate request
        const body = await request.json();
        const validation = submitPriorAuthSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { referral_id, auth_number, notes } = validation.data;

        // Update referral with prior auth submission
        const { error: updateError } = await supabase
            .from('referrals')
            .update({
                status: 'PRIOR_AUTH_SUBMITTED',
                prior_auth_submitted_at: new Date().toISOString(),
                prior_auth_number: auth_number || null,
                prior_auth_status: 'PENDING',
                last_updated_by: user.id,
            })
            .eq('id', referral_id);

        if (updateError) {
            console.error('Update referral error:', updateError);
            return NextResponse.json(
                { error: 'Failed to update referral' },
                { status: 500 }
            );
        }

        // Update any pending prior auth tasks to in-progress
        await supabase
            .from('staff_scheduling_tasks')
            .update({
                status: 'IN_PROGRESS',
                assigned_to: user.id,
                started_at: new Date().toISOString(),
                verification_notes: notes,
            })
            .eq('referral_id', referral_id)
            .eq('task_type', 'SUBMIT_PRIOR_AUTH')
            .eq('status', 'PENDING');

        // Log metric event
        await supabase.from('referral_metrics').insert({
            referral_id,
            event_type: 'PRIOR_AUTH_SUBMITTED',
            event_data: {
                auth_number,
                submitted_by: user.id,
            },
            actor_id: user.id,
            actor_role: profile.role,
        });

        return NextResponse.json({
            success: true,
            message: 'Prior authorization submitted',
            data: {
                status: 'PENDING',
                submitted_at: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Submit prior auth error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/prior-auth
 * Update prior authorization status (approve/deny)
 */
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user is staff
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'staff') {
            return NextResponse.json(
                { error: 'Only staff can update prior auth status' },
                { status: 403 }
            );
        }

        // Parse and validate request
        const body = await request.json();
        const validation = updatePriorAuthSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const {
            referral_id,
            status,
            auth_number,
            expiration_date,
            denial_reason,
            verification_method,
            verification_reference,
            verification_agent_name,
            verification_notes,
        } = validation.data;

        // Determine new referral status based on auth result
        let newReferralStatus: string;
        switch (status) {
            case 'APPROVED':
                newReferralStatus = 'PRIOR_AUTH_APPROVED';
                break;
            case 'DENIED':
                newReferralStatus = 'PRIOR_AUTH_DENIED';
                break;
            default:
                newReferralStatus = 'PRIOR_AUTH_SUBMITTED';
        }

        // Update referral
        const updateData: Record<string, unknown> = {
            status: newReferralStatus,
            prior_auth_status: status,
            prior_auth_number: auth_number,
            prior_auth_expiration_date: expiration_date,
            prior_auth_denial_reason: denial_reason,
            last_updated_by: user.id,
            last_verified_by: user.id,
            last_verified_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
            .from('referrals')
            .update(updateData)
            .eq('id', referral_id);

        if (updateError) {
            console.error('Update referral error:', updateError);
            return NextResponse.json(
                { error: 'Failed to update referral' },
                { status: 500 }
            );
        }

        // Complete the prior auth task
        const taskUpdateData: Record<string, unknown> = {
            status: 'COMPLETED',
            completed_at: new Date().toISOString(),
            completion_notes: `Prior auth ${status.toLowerCase()}. ${denial_reason || ''}`.trim(),
        };

        if (verification_method) {
            taskUpdateData.verification_method = verification_method;
            taskUpdateData.verification_reference = verification_reference;
            taskUpdateData.verification_agent_name = verification_agent_name;
            taskUpdateData.verification_notes = verification_notes;
        }

        await supabase
            .from('staff_scheduling_tasks')
            .update(taskUpdateData)
            .eq('referral_id', referral_id)
            .eq('task_type', 'SUBMIT_PRIOR_AUTH')
            .in('status', ['PENDING', 'IN_PROGRESS']);

        // Log metric event
        await supabase.from('referral_metrics').insert({
            referral_id,
            event_type: 'STATUS_CHANGED',
            event_data: {
                old_status: 'PRIOR_AUTH_SUBMITTED',
                new_status: newReferralStatus,
                prior_auth_status: status,
                manually_verified: !!verification_method,
            },
            actor_id: user.id,
            actor_role: 'staff',
        });

        return NextResponse.json({
            success: true,
            message: `Prior authorization ${status.toLowerCase()}`,
            data: {
                status,
                referral_status: newReferralStatus,
            },
        });
    } catch (error) {
        console.error('Update prior auth error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
