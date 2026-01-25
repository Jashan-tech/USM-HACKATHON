import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
    ClipboardList,
    Clock,
    AlertTriangle,
    CheckCircle,
    User,
    Phone,
    FileText,
    Zap,
    Filter,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Priority configuration
const PRIORITY_CONFIG = {
    CRITICAL: { color: 'bg-red-500 text-white', icon: AlertTriangle },
    HIGH: { color: 'bg-orange-500 text-white', icon: AlertTriangle },
    MEDIUM: { color: 'bg-yellow-500 text-white', icon: Clock },
    LOW: { color: 'bg-green-500 text-white', icon: CheckCircle },
};

const TASK_TYPE_LABELS: Record<string, string> = {
    MANUAL_SCHEDULING: 'Manual Scheduling',
    MANUAL_ELIGIBILITY_CHECK: 'Eligibility Check',
    SUBMIT_PRIOR_AUTH: 'Prior Authorization',
    DOCUMENT_REVIEW: 'Document Review',
    CONFLICT_RESOLUTION: 'Conflict Resolution',
    HOSPICE_URGENT_INTAKE: 'Hospice Intake (URGENT)',
    MANUAL_PATIENT_OUTREACH: 'Patient Outreach',
    INSURANCE_VERIFICATION: 'Insurance Verification',
    GENERAL: 'General Task',
};

interface PageProps {
    searchParams: { status?: string; priority?: string; type?: string };
}

export default async function StaffQueuePage({ searchParams }: PageProps) {
    const supabase = await createServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        // If not logged in, redirect to login
        redirect('/login');
    }

    // Get user profile to determine role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'staff') {
        // If not a staff member, redirect
        redirect('/login');
    }

    // Build query for staff tasks
    let query = supabase
        .from('staff_scheduling_tasks')
        .select(
            `
                *,
                referral:referrals(
                    id,
                    specialist_type,
                    urgency_level,
                    status,
                    payer_name,
                    patient:profiles!referrals_patient_id_fkey(full_name, phone, email)
                ),
                assignee:profiles!staff_scheduling_tasks_assigned_to_fkey(full_name)
            `
        )
        .order('created_at', { ascending: false });

    // Apply filters
    if (searchParams.status) {
        query = query.eq('status', searchParams.status);
    } else {
        // Default: show pending and in-progress
        query = query.in('status', ['PENDING', 'IN_PROGRESS']);
    }

    if (searchParams.priority) {
        query = query.eq('priority', searchParams.priority);
    }

    if (searchParams.type) {
        query = query.eq('task_type', searchParams.type);
    }

    const { data: tasks, error } = await query;

    if (error) {
        console.error('Error fetching tasks:', error);
        return (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Error loading tasks
                </h3>
                <p className="text-gray-500">
                    Unable to load tasks. Please try again later.
                </p>
            </div>
        );
    }

    // Calculate stats from all tasks (not filtered)
    const stats = {
        pending: tasks?.filter(t => t.status === 'PENDING').length || 0,
        inProgress: tasks?.filter(t => t.status === 'IN_PROGRESS').length || 0,
        critical: tasks?.filter(t => t.priority === 'CRITICAL').length || 0,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Staff Queue
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Manage scheduling tasks and patient requests
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="rounded-2xl">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                            <Clock className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats.pending}
                            </p>
                            <p className="text-sm text-gray-500">Pending</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <Zap className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats.inProgress}
                            </p>
                            <p className="text-sm text-gray-500">In Progress</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-red-200 bg-red-50 dark:bg-red-900/10">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-600">
                                {stats.critical}
                            </p>
                            <p className="text-sm text-red-500">Critical</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <Link href="/queue">
                    <Button
                        variant={!searchParams.status && !searchParams.priority ? 'default' : 'outline'}
                        size="sm"
                    >
                        All Active
                    </Button>
                </Link>
                <Link href="/queue?priority=CRITICAL">
                    <Button
                        variant={searchParams.priority === 'CRITICAL' ? 'default' : 'outline'}
                        size="sm"
                        className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200"
                    >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Critical
                    </Button>
                </Link>
                <Link href="/queue?type=HOSPICE_URGENT_INTAKE">
                    <Button
                        variant={searchParams.type === 'HOSPICE_URGENT_INTAKE' ? 'default' : 'outline'}
                        size="sm"
                    >
                        Hospice STAT
                    </Button>
                </Link>
                <Link href="/queue?type=SUBMIT_PRIOR_AUTH">
                    <Button
                        variant={searchParams.type === 'SUBMIT_PRIOR_AUTH' ? 'default' : 'outline'}
                        size="sm"
                    >
                        Prior Auth
                    </Button>
                </Link>
                <Link href="/queue?type=DOCUMENT_REVIEW">
                    <Button
                        variant={searchParams.type === 'DOCUMENT_REVIEW' ? 'default' : 'outline'}
                        size="sm"
                    >
                        Document Review
                    </Button>
                </Link>
                <Link href="/queue?status=COMPLETED">
                    <Button
                        variant={searchParams.status === 'COMPLETED' ? 'default' : 'outline'}
                        size="sm"
                    >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                    </Button>
                </Link>
            </div>

            {/* Task List */}
            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-blue-500" />
                        Tasks
                        <Badge variant="secondary">{tasks?.length || 0}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {tasks && tasks.length > 0 ? (
                        <div className="space-y-3">
                            {tasks.map((task) => {
                                const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
                                const PriorityIcon = priorityConfig?.icon || Clock;
                                const hasSLA = task.sla_due_at;
                                const slaPassed = hasSLA && new Date(task.sla_due_at) < new Date();

                                return (
                                    <Link
                                        key={task.id}
                                        href={`/tasks/${task.id}`}
                                        className={`block p-4 rounded-xl border transition-all hover:shadow-md ${task.priority === 'CRITICAL'
                                            ? 'border-red-300 bg-red-50 dark:bg-red-900/10'
                                            : 'bg-gray-50 dark:bg-gray-800 border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            {/* Left side - Task info */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className={priorityConfig?.color || 'bg-gray-500'}>
                                                        <PriorityIcon className="w-3 h-3 mr-1" />
                                                        {task.priority}
                                                    </Badge>
                                                    <Badge variant="outline">
                                                        {TASK_TYPE_LABELS[task.task_type] || task.task_type}
                                                    </Badge>
                                                    {task.status === 'IN_PROGRESS' && (
                                                        <Badge className="bg-blue-500 text-white">
                                                            In Progress
                                                        </Badge>
                                                    )}
                                                </div>

                                                <p className="font-medium text-gray-900 dark:text-white mb-1">
                                                    {task.referral?.specialist_type || 'Unknown'} Referral
                                                </p>

                                                {task.instructions && (
                                                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                                                        {task.instructions}
                                                    </p>
                                                )}

                                                {/* Patient info */}
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {task.referral?.patient?.full_name || 'Unknown Patient'}
                                                    </span>
                                                    {task.referral?.patient?.phone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            {task.referral.patient.phone}
                                                        </span>
                                                    )}
                                                    {task.referral?.payer_name && (
                                                        <span className="flex items-center gap-1">
                                                            <FileText className="w-3 h-3" />
                                                            {task.referral.payer_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right side - SLA & assignment */}
                                            <div className="text-right">
                                                {hasSLA && (
                                                    <div
                                                        className={`text-sm font-medium mb-2 ${slaPassed ? 'text-red-600' : 'text-orange-600'
                                                            }`}
                                                    >
                                                        <Clock className="w-3 h-3 inline mr-1" />
                                                        {slaPassed
                                                            ? 'SLA BREACHED'
                                                            : `Due ${formatDistanceToNow(new Date(task.sla_due_at), { addSuffix: true })}`}
                                                    </div>
                                                )}

                                                {task.assignee ? (
                                                    <p className="text-sm text-gray-500">
                                                        Assigned to: {task.assignee.full_name}
                                                    </p>
                                                ) : (
                                                    <p className="text-sm text-gray-400">Unassigned</p>
                                                )}

                                                <p className="text-xs text-gray-400 mt-1">
                                                    Created {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-300" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                All caught up!
                            </h3>
                            <p className="text-gray-500">
                                No tasks matching your filters
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
