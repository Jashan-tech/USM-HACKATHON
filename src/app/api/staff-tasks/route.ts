import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/redis';
import { z } from 'zod';

// Validation schemas
const createTaskSchema = z.object({
    referral_id: z.string().uuid(),
    task_type: z.enum([
        'MANUAL_SCHEDULING',
        'MANUAL_ELIGIBILITY_CHECK',
        'SUBMIT_PRIOR_AUTH',
        'DOCUMENT_REVIEW',
        'CONFLICT_RESOLUTION',
        'HOSPICE_URGENT_INTAKE',
        'MANUAL_PATIENT_OUTREACH',
        'INSURANCE_VERIFICATION',
        'GENERAL',
    ]),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    instructions: z.string().optional(),
    required_fields: z.record(z.unknown()).optional(),
    required_documents: z.array(z.string()).optional(),
    required_actions: z.array(z.string()).optional(),
    sla_hours: z.number().int().positive().optional(),
});

const updateTaskSchema = z.object({
    id: z.string().uuid(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    assigned_to: z.string().uuid().optional().nullable(),
    completion_notes: z.string().optional(),
    verification_method: z.enum(['PHONE', 'PAYER_PORTAL', 'FAX', 'OTHER']).optional(),
    verification_reference: z.string().optional(),
    verification_agent_name: z.string().optional(),
    verification_notes: z.string().optional(),
});

/**
 * GET /api/staff-tasks
 * List staff tasks with filters
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

        // Verify user is staff or doctor
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // Rate limiting
        const rateLimit = await checkRateLimit(`staff-tasks:${user.id}`, 60, 60000);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded' },
                { status: 429 }
            );
        }

        // Parse query params
        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        const taskType = searchParams.get('type');
        const assignedToMe = searchParams.get('assigned_to_me') === 'true';
        const unassigned = searchParams.get('unassigned') === 'true';
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Build query
        let query = supabase
            .from('staff_scheduling_tasks')
            .select(`
        *,
        referral:referrals(
          id,
          patient_id,
          specialist_type,
          urgency_level,
          status,
          patient:profiles!referrals_patient_id_fkey(full_name, phone, email)
        ),
        assignee:profiles!staff_scheduling_tasks_assigned_to_fkey(full_name, email)
      `)
            .order('priority', { ascending: false }) // CRITICAL first
            .order('sla_due_at', { ascending: true, nullsFirst: false }) // Earliest SLA first
            .order('created_at', { ascending: false });

        // Apply filters
        if (status) {
            query = query.eq('status', status);
        }

        if (priority) {
            query = query.eq('priority', priority);
        }

        if (taskType) {
            query = query.eq('task_type', taskType);
        }

        if (assignedToMe) {
            query = query.eq('assigned_to', user.id);
        }

        if (unassigned) {
            query = query.is('assigned_to', null);
        }

        // Staff can see all tasks, doctors can only see tasks for their referrals
        if (profile.role === 'doctor') {
            const { data: doctorReferrals } = await supabase
                .from('referrals')
                .select('id')
                .eq('doctor_id', user.id);

            const referralIds = doctorReferrals?.map((r) => r.id) || [];
            query = query.in('referral_id', referralIds);
        }

        // Pagination
        query = query.range(offset, offset + limit - 1);

        const { data: tasks, error } = await query;

        if (error) {
            console.error('Error fetching staff tasks:', error);
            return NextResponse.json(
                { error: 'Failed to fetch tasks' },
                { status: 500 }
            );
        }

        // Get counts by status for stats
        const { data: statusCounts } = await supabase
            .from('staff_scheduling_tasks')
            .select('status, priority')
            .in('status', ['PENDING', 'IN_PROGRESS']);

        const stats = {
            pending: statusCounts?.filter((t) => t.status === 'PENDING').length || 0,
            in_progress: statusCounts?.filter((t) => t.status === 'IN_PROGRESS').length || 0,
            critical: statusCounts?.filter((t) => t.priority === 'CRITICAL').length || 0,
        };

        return NextResponse.json({
            data: tasks,
            stats,
        });
    } catch (error) {
        console.error('Staff tasks API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/staff-tasks
 * Create a new staff task
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
        const rateLimit = await checkRateLimit(`staff-tasks:create:${user.id}`, 20, 60000);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded' },
                { status: 429 }
            );
        }

        // Parse and validate request
        const body = await request.json();
        const validation = createTaskSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const taskData = validation.data;

        // Calculate SLA due time if sla_hours provided
        const sla_due_at = taskData.sla_hours
            ? new Date(Date.now() + taskData.sla_hours * 60 * 60 * 1000).toISOString()
            : null;

        // Create task
        const { data: task, error } = await supabase
            .from('staff_scheduling_tasks')
            .insert({
                ...taskData,
                sla_due_at,
                priority: taskData.priority || 'MEDIUM',
                status: 'PENDING',
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating staff task:', error);
            return NextResponse.json(
                { error: 'Failed to create task' },
                { status: 500 }
            );
        }

        // Log metric event
        await supabase.from('referral_metrics').insert({
            referral_id: taskData.referral_id,
            event_type: 'STAFF_HELP_REQUESTED',
            event_data: {
                task_type: taskData.task_type,
                task_id: task.id,
                priority: taskData.priority || 'MEDIUM',
            },
            actor_id: user.id,
        });

        return NextResponse.json({ data: task }, { status: 201 });
    } catch (error) {
        console.error('Create staff task error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/staff-tasks
 * Update a staff task
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
                { error: 'Only staff can update tasks' },
                { status: 403 }
            );
        }

        // Parse and validate request
        const body = await request.json();
        const validation = updateTaskSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { id, status, ...updateFields } = validation.data;

        // Build update object
        const updateData: Record<string, unknown> = { ...updateFields };

        if (status) {
            updateData.status = status;

            if (status === 'IN_PROGRESS' && !updateData.started_at) {
                updateData.started_at = new Date().toISOString();
                updateData.assigned_to = user.id;
            }

            if (status === 'COMPLETED') {
                updateData.completed_at = new Date().toISOString();
            }
        }

        // Update task
        const { data: task, error } = await supabase
            .from('staff_scheduling_tasks')
            .update(updateData)
            .eq('id', id)
            .select(`
        *,
        referral:referrals(id, status)
      `)
            .single();

        if (error) {
            console.error('Error updating staff task:', error);
            return NextResponse.json(
                { error: 'Failed to update task' },
                { status: 500 }
            );
        }

        // If task completed, update referral status if needed
        if (status === 'COMPLETED' && task.referral) {
            const referralId = task.referral_id;
            const taskType = task.task_type;

            // Determine new referral status based on task type
            let newReferralStatus: string | null = null;

            switch (taskType) {
                case 'MANUAL_ELIGIBILITY_CHECK':
                    newReferralStatus = 'ELIGIBILITY_CONFIRMED';
                    break;
                case 'MANUAL_SCHEDULING':
                    // Will be updated when booking is created
                    break;
                case 'DOCUMENT_REVIEW':
                case 'CONFLICT_RESOLUTION':
                    newReferralStatus = 'VERIFIED';
                    break;
            }

            if (newReferralStatus) {
                await supabase
                    .from('referrals')
                    .update({
                        status: newReferralStatus,
                        last_updated_by: user.id,
                        last_verified_by: user.id,
                        last_verified_at: new Date().toISOString(),
                    })
                    .eq('id', referralId);
            }
        }

        return NextResponse.json({ data: task });
    } catch (error) {
        console.error('Update staff task error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
