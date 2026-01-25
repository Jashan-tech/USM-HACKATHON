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
    // DEMO MODE: Hardcoded demo tasks for hackathon presentation
    const demoTasks = [
        {
            id: 'task-001',
            task_type: 'HOSPICE_URGENT_INTAKE',
            priority: 'CRITICAL',
            status: 'PENDING',
            instructions: 'STAT HOSPICE REFERRAL - Patient requires immediate intake within 24 hours. Medicare hospice benefit verification needed.',
            sla_hours: 24,
            sla_due_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            referral: { id: 'ref-001', specialist_type: 'Hospice Care', urgency_level: 'STAT', status: 'CREATED', payer_name: 'Medicare', patient: { full_name: 'Margaret Johnson', phone: '555-234-5678', email: 'margaret.j@email.com' } },
            assignee: null
        },
        {
            id: 'task-002',
            task_type: 'SUBMIT_PRIOR_AUTH',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            instructions: 'Submit prior authorization request for cardiology consultation. Patient has existing cardiac history.',
            sla_hours: 48,
            sla_due_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
            created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
            referral: { id: 'ref-002', specialist_type: 'Cardiology', urgency_level: 'URGENT', status: 'PRIOR_AUTH_REQUIRED', payer_name: 'Aetna PPO', patient: { full_name: 'Robert Williams', phone: '555-345-6789', email: 'rwilliams@email.com' } },
            assignee: { full_name: 'Alex Rivera' }
        },
        {
            id: 'task-003',
            task_type: 'MANUAL_SCHEDULING',
            priority: 'MEDIUM',
            status: 'PENDING',
            instructions: 'Schedule orthopedic consultation. Patient prefers morning appointments.',
            sla_hours: 72,
            sla_due_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            referral: { id: 'ref-003', specialist_type: 'Orthopedics', urgency_level: 'ROUTINE', status: 'SCHEDULING', payer_name: 'Blue Cross', patient: { full_name: 'Sarah Chen', phone: '555-456-7890', email: 'schen@email.com' } },
            assignee: null
        },
        {
            id: 'task-004',
            task_type: 'DOCUMENT_REVIEW',
            priority: 'HIGH',
            status: 'PENDING',
            instructions: 'Review oncology referral documentation. Verify all required clinical notes are present.',
            sla_hours: 24,
            sla_due_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // Overdue!
            created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
            referral: { id: 'ref-004', specialist_type: 'Oncology', urgency_level: 'URGENT', status: 'NEEDS_REVIEW', payer_name: 'UnitedHealthcare', patient: { full_name: 'James Wilson', phone: '555-567-8901', email: 'jwilson@email.com' } },
            assignee: null
        },
        {
            id: 'task-005',
            task_type: 'MANUAL_PATIENT_OUTREACH',
            priority: 'MEDIUM',
            status: 'PENDING',
            instructions: 'Contact patient to confirm availability for gastroenterology appointment.',
            sla_hours: 48,
            sla_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            referral: { id: 'ref-005', specialist_type: 'Gastroenterology', urgency_level: 'ROUTINE', status: 'SCHEDULING', payer_name: 'Cigna', patient: { full_name: 'Maria Garcia', phone: '555-678-9012', email: 'mgarcia@email.com' } },
            assignee: { full_name: 'Sam Thompson' }
        },
        {
            id: 'task-006',
            task_type: 'SUBMIT_PRIOR_AUTH',
            priority: 'CRITICAL',
            status: 'PENDING',
            instructions: 'URGENT: Prior auth needed for neurology MRI. Suspected MS symptoms.',
            sla_hours: 12,
            sla_due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            referral: { id: 'ref-008', specialist_type: 'Neurology', urgency_level: 'STAT', status: 'PRIOR_AUTH_REQUIRED', payer_name: 'Anthem', patient: { full_name: 'Michael Thompson', phone: '555-789-0123', email: 'mthompson@email.com' } },
            assignee: null
        },
        {
            id: 'task-007',
            task_type: 'INSURANCE_VERIFICATION',
            priority: 'LOW',
            status: 'PENDING',
            instructions: 'Verify insurance eligibility for routine dermatology visit.',
            sla_hours: 72,
            sla_due_at: new Date(Date.now() + 60 * 60 * 60 * 1000).toISOString(),
            created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            referral: { id: 'ref-006', specialist_type: 'Dermatology', urgency_level: 'ROUTINE', status: 'ELIGIBILITY_VERIFIED', payer_name: 'Humana', patient: { full_name: 'David Lee', phone: '555-890-1234', email: 'dlee@email.com' } },
            assignee: null
        },
    ];

    // Apply filters
    let tasks = [...demoTasks];

    if (searchParams.status) {
        if (searchParams.status === 'COMPLETED') {
            tasks = []; // No completed demo tasks
        } else {
            tasks = tasks.filter(t => t.status === searchParams.status);
        }
    } else {
        // Default: show pending and in-progress
        tasks = tasks.filter(t => ['PENDING', 'IN_PROGRESS'].includes(t.status));
    }

    if (searchParams.priority) {
        tasks = tasks.filter(t => t.priority === searchParams.priority);
    }

    if (searchParams.type) {
        tasks = tasks.filter(t => t.task_type === searchParams.type);
    }

    // Calculate stats from all demo tasks (not filtered)
    const stats = {
        pending: demoTasks.filter(t => t.status === 'PENDING').length,
        inProgress: demoTasks.filter(t => t.status === 'IN_PROGRESS').length,
        critical: demoTasks.filter(t => t.priority === 'CRITICAL').length,
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
