
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SplitScreenValidation } from '@/components/forms/SplitScreenValidation';
import {
    ArrowLeft,
    User,
    Phone,
    Mail,
    FileText,
    Clock,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Calendar,
    Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface Task {
    id: string;
    referral_id: string;
    task_type: string;
    priority: string;
    status: string;
    instructions: string;
    required_fields: Record<string, unknown>;
    required_documents: string[];
    required_actions: string[];
    sla_hours: number;
    sla_due_at: string;
    created_at: string;
    referral: {
        id: string;
        specialist_type: string;
        urgency_level: string;
        status: string;
        payer_name: string;
        member_id: string;
        group_number: string;
        documents: Array<{
            file_url: string;
            type: string;
            extraction_result?: {
                extracted_fields: Record<string, string>;
                confidence_scores: Record<string, number>;
            };
        }>;
        extraction_conflicts: Array<{
            field: string;
            source_1: { value: string };
            source_2: { value: string };
            severity: string;
        }>;
        patient: {
            full_name: string;
            phone: string;
            email: string;
        };
    };
}

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

export default function TaskDetailPage() {
    const router = useRouter();
    const params = useParams();
    const taskId = params.id as string;

    const [task, setTask] = useState<Task | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [completionNotes, setCompletionNotes] = useState('');
    const [showValidation, setShowValidation] = useState(false);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        async function fetchTask() {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('staff_scheduling_tasks')
                    .select(`
            *,
            referral:referrals(
              id,
              specialist_type,
              urgency_level,
              status,
              payer_name,
              member_id,
              group_number,
              documents,
              extraction_conflicts,
              patient:profiles!referrals_patient_id_fkey(full_name, phone, email)
            )
          `)
                    .eq('id', taskId)
                    .single();

                if (error) throw error;
                setTask(data);

                // Auto-show validation for document review tasks
                if (data.task_type === 'DOCUMENT_REVIEW' || data.task_type === 'CONFLICT_RESOLUTION') {
                    setShowValidation(true);
                }
            } catch (error) {
                console.error('Error fetching task:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchTask();
    }, [taskId, supabase]);

    async function handleStartTask() {
        setIsProcessing(true);
        try {
            await fetch('/api/staff-tasks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: taskId,
                    status: 'IN_PROGRESS',
                }),
            });
            setTask((prev) => (prev ? { ...prev, status: 'IN_PROGRESS' } : null));
        } finally {
            setIsProcessing(false);
        }
    }

    async function handleCompleteTask() {
        setIsProcessing(true);
        try {
            await fetch('/api/staff-tasks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: taskId,
                    status: 'COMPLETED',
                    completion_notes: completionNotes,
                }),
            });
            router.push('/queue');
        } finally {
            setIsProcessing(false);
        }
    }

    async function handleCancelTask() {
        setIsProcessing(true);
        try {
            await fetch('/api/staff-tasks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: taskId,
                    status: 'CANCELLED',
                    completion_notes: completionNotes,
                }),
            });
            router.push('/queue');
        } finally {
            setIsProcessing(false);
        }
    }

    async function handleAutoBook() {
        setIsProcessing(true);
        try {
            // Call booking API to auto-book earliest slot
            await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    referral_id: task?.referral_id,
                    auto_book: true,
                }),
            });

            // Complete the task
            await handleCompleteTask();
        } catch (error) {
            console.error('Auto-book failed:', error);
            setIsProcessing(false);
        }
    }

    async function handleSaveValidation(
        verifiedData: Record<string, string>,
        manualOverride?: { verification_method: string; verification_reference: string; verification_notes: string }
    ) {
        setIsProcessing(true);
        try {
            // Update referral with verified data
            await supabase
                .from('referrals')
                .update({
                    member_id: verifiedData.member_id,
                    group_number: verifiedData.group_number,
                    payer_name: verifiedData.payer_name,
                    status: 'VERIFIED',
                })
                .eq('id', task?.referral_id);

            // Complete task with verification info
            await fetch('/api/staff-tasks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: taskId,
                    status: 'COMPLETED',
                    verification_method: manualOverride?.verification_method,
                    verification_reference: manualOverride?.verification_reference,
                    verification_notes: manualOverride?.verification_notes,
                }),
            });

            router.push('/queue');
        } finally {
            setIsProcessing(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!task) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Task not found</p>
                <Link href="/queue">
                    <Button variant="outline" className="mt-4">
                        Back to Queue
                    </Button>
                </Link>
            </div>
        );
    }

    // Show split-screen validation view
    if (showValidation && task.referral.documents?.length > 0) {
        const doc = task.referral.documents[task.referral.documents.length - 1];
        const fields = Object.entries(doc.extraction_result?.extracted_fields || {}).map(
            ([field_name, value]) => ({
                field_name,
                label: field_name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                extracted_value: value as string,
                existing_value: task.referral[field_name as keyof typeof task.referral] as string,
                confidence: doc.extraction_result?.confidence_scores?.[field_name] || 0,
                has_conflict: task.referral.extraction_conflicts?.some((c) => c.field === field_name) || false,
            })
        );

        return (
            <div className="h-[calc(100vh-100px)]">
                <SplitScreenValidation
                    documentUrl={doc.file_url || ''}
                    documentType={doc.type}
                    fields={fields}
                    onSave={handleSaveValidation}
                    onCancel={() => setShowValidation(false)}
                />
            </div>
        );
    }

    const hasSLA = task.sla_due_at;
    const slaPassed = hasSLA && new Date(task.sla_due_at) < new Date();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/queue">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {TASK_TYPE_LABELS[task.task_type] || task.task_type}
                    </h1>
                    <p className="text-gray-500">
                        {task.referral.specialist_type} Referral
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge
                        className={
                            task.priority === 'CRITICAL'
                                ? 'bg-red-500 text-white'
                                : task.priority === 'HIGH'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-yellow-500 text-white'
                        }
                    >
                        {task.priority}
                    </Badge>
                    <Badge
                        variant={task.status === 'IN_PROGRESS' ? 'default' : 'outline'}
                    >
                        {task.status}
                    </Badge>
                </div>
            </div>

            {/* SLA Warning */}
            {hasSLA && (
                <div
                    className={`p-4 rounded-xl ${slaPassed
                            ? 'bg-red-100 dark:bg-red-900/20 border border-red-200'
                            : 'bg-orange-100 dark:bg-orange-900/20 border border-orange-200'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Clock className={`w-5 h-5 ${slaPassed ? 'text-red-600' : 'text-orange-600'}`} />
                        <span className={`font-medium ${slaPassed ? 'text-red-700' : 'text-orange-700'}`}>
                            {slaPassed
                                ? 'SLA BREACHED - Immediate action required'
                                : `SLA Due: ${formatDistanceToNow(new Date(task.sla_due_at), { addSuffix: true })}`}
                        </span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Instructions */}
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="text-lg">Instructions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-700 dark:text-gray-300">
                                {task.instructions || 'No specific instructions provided.'}
                            </p>

                            {task.required_actions && task.required_actions.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-medium mb-2">Required Actions:</h4>
                                    <ul className="space-y-2">
                                        {task.required_actions.map((action, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <CheckCircle className="w-4 h-4 text-gray-400 mt-0.5" />
                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                    {action}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Completion Notes */}
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="text-lg">Completion Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={completionNotes}
                                onChange={(e) => setCompletionNotes(e.target.value)}
                                placeholder="Add notes about the task completion..."
                                rows={4}
                            />
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex gap-3">
                        {task.status === 'PENDING' && (
                            <Button onClick={handleStartTask} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Start Task
                            </Button>
                        )}

                        {task.task_type === 'MANUAL_SCHEDULING' && (
                            <Button
                                onClick={handleAutoBook}
                                disabled={isProcessing}
                                className="bg-green-500 hover:bg-green-600"
                            >
                                <Calendar className="w-4 h-4 mr-2" />
                                Auto-Book Earliest Slot
                            </Button>
                        )}

                        {task.task_type === 'DOCUMENT_REVIEW' && task.referral.documents?.length > 0 && (
                            <Button onClick={() => setShowValidation(true)}>
                                <FileText className="w-4 h-4 mr-2" />
                                Open Document Review
                            </Button>
                        )}

                        <Button
                            onClick={handleCompleteTask}
                            disabled={isProcessing}
                            variant="default"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Complete Task
                        </Button>

                        <Button
                            onClick={handleCancelTask}
                            disabled={isProcessing}
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                    </div>
                </div>

                {/* Sidebar - Patient & Referral Info */}
                <div className="space-y-6">
                    {/* Patient Info */}
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-500" />
                                Patient
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="font-medium text-gray-900 dark:text-white">
                                {task.referral.patient.full_name}
                            </p>
                            {task.referral.patient.phone && (
                                <a
                                    href={`tel:${task.referral.patient.phone}`}
                                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                                >
                                    <Phone className="w-4 h-4" />
                                    {task.referral.patient.phone}
                                </a>
                            )}
                            {task.referral.patient.email && (
                                <a
                                    href={`mailto:${task.referral.patient.email}`}
                                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                                >
                                    <Mail className="w-4 h-4" />
                                    {task.referral.patient.email}
                                </a>
                            )}
                        </CardContent>
                    </Card>

                    {/* Insurance Info */}
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="w-5 h-5 text-green-500" />
                                Insurance
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div>
                                <span className="text-gray-500">Payer:</span>
                                <span className="ml-2 font-medium">{task.referral.payer_name || 'Unknown'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Member ID:</span>
                                <span className="ml-2 font-mono">{task.referral.member_id || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Group:</span>
                                <span className="ml-2 font-mono">{task.referral.group_number || 'N/A'}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Referral Link */}
                    <Link href={`/referrals/${task.referral_id}`}>
                        <Button variant="outline" className="w-full">
                            View Full Referral
                            <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
