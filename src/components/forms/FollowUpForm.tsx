'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    ThumbsUp,
    ThumbsDown,
    Calendar,
    HeartPulse,
    MessageCircle,
    Clock,
    Sparkles,
} from 'lucide-react';

interface FollowUpFormProps {
    referralId: string;
    patientName: string;
    specialistType: string;
    followUpDueAt?: string;
    onSubmit: (data: FollowUpResponse) => Promise<void>;
    onRequestSchedulingHelp: () => void;
    onSelfSchedule: () => void;
}

interface FollowUpResponse {
    symptoms_improved: boolean;
    appointment_scheduled: boolean;
    additional_notes?: string;
}

export function FollowUpForm({
    referralId,
    patientName,
    specialistType,
    followUpDueAt,
    onSubmit,
    onRequestSchedulingHelp,
    onSelfSchedule,
}: FollowUpFormProps) {
    const [symptomsImproved, setSymptomsImproved] = useState<boolean | null>(null);
    const [appointmentScheduled, setAppointmentScheduled] = useState<boolean | null>(null);
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [aiMessage, setAiMessage] = useState<string | null>(null);
    const [showActions, setShowActions] = useState(false);

    const isComplete = symptomsImproved !== null && appointmentScheduled !== null;

    async function handleSubmit() {
        if (!isComplete) return;

        setIsSubmitting(true);
        try {
            await onSubmit({
                symptoms_improved: symptomsImproved!,
                appointment_scheduled: appointmentScheduled!,
                additional_notes: additionalNotes || undefined,
            });

            // If symptoms improved but no appointment, trigger AI message
            if (symptomsImproved && !appointmentScheduled) {
                await generatePreventiveMessage();
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    async function generatePreventiveMessage() {
        try {
            const response = await fetch(`/api/chat/${referralId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message_text: `Hi ${patientName}! We noticed your symptoms have improved, which is great news! However, we still recommend completing your ${specialistType} visit for a few important reasons:

• Preventive care can help identify underlying issues before they become serious
• A specialist can provide guidance on preventing future occurrences
• Documentation of your visit ensures continuity of care

Would you like help scheduling your appointment?`,
                    message_type: 'AI_GENERATED',
                }),
            });

            if (response.ok) {
                setAiMessage(
                    `Even though symptoms have improved, completing your ${specialistType} visit can help prevent future issues and ensure comprehensive care.`
                );
                setShowActions(true);
            }
        } catch (error) {
            console.error('Failed to generate preventive message:', error);
        }
    }

    return (
        <Card className="rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        <CardTitle className="text-lg">Follow-Up Check</CardTitle>
                    </div>
                    {followUpDueAt && (
                        <Badge className="bg-white/20 text-white">
                            Due: {new Date(followUpDueAt).toLocaleDateString()}
                        </Badge>
                    )}
                </div>
                <p className="text-blue-100 text-sm mt-1">
                    Help us understand how you&apos;re doing with your {specialistType} referral
                </p>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                {/* Question 1: Symptoms */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <HeartPulse className="w-5 h-5 text-pink-500" />
                        <h3 className="font-medium text-gray-900 dark:text-white">
                            Have your symptoms improved?
                        </h3>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant={symptomsImproved === true ? 'default' : 'outline'}
                            className={`flex-1 gap-2 ${symptomsImproved === true
                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                    : ''
                                }`}
                            onClick={() => setSymptomsImproved(true)}
                        >
                            <ThumbsUp className="w-4 h-4" />
                            Yes, improved
                        </Button>
                        <Button
                            variant={symptomsImproved === false ? 'default' : 'outline'}
                            className={`flex-1 gap-2 ${symptomsImproved === false
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : ''
                                }`}
                            onClick={() => setSymptomsImproved(false)}
                        >
                            <ThumbsDown className="w-4 h-4" />
                            No, same or worse
                        </Button>
                    </div>
                </div>

                {/* Question 2: Appointment */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        <h3 className="font-medium text-gray-900 dark:text-white">
                            Have you scheduled your appointment?
                        </h3>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant={appointmentScheduled === true ? 'default' : 'outline'}
                            className={`flex-1 gap-2 ${appointmentScheduled === true
                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                    : ''
                                }`}
                            onClick={() => setAppointmentScheduled(true)}
                        >
                            <ThumbsUp className="w-4 h-4" />
                            Yes, scheduled
                        </Button>
                        <Button
                            variant={appointmentScheduled === false ? 'default' : 'outline'}
                            className={`flex-1 gap-2 ${appointmentScheduled === false
                                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                    : ''
                                }`}
                            onClick={() => setAppointmentScheduled(false)}
                        >
                            <ThumbsDown className="w-4 h-4" />
                            Not yet
                        </Button>
                    </div>
                </div>

                {/* Additional notes */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-purple-500" />
                        <h3 className="font-medium text-gray-900 dark:text-white">
                            Anything else you&apos;d like to share? (optional)
                        </h3>
                    </div>
                    <Textarea
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        placeholder="Add any additional notes or concerns..."
                        rows={3}
                    />
                </div>

                {/* Submit button */}
                <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={!isComplete || isSubmitting}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Follow-Up'}
                </Button>

                {/* AI Message */}
                {aiMessage && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                                <Sparkles className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                                    Preventive Care Recommendation
                                </p>
                                <p className="text-sm text-purple-700 dark:text-purple-200">
                                    {aiMessage}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action buttons (shown after AI message) */}
                {showActions && (
                    <div className="flex gap-3 mt-4">
                        <Button
                            variant="default"
                            className="flex-1 gap-2 bg-blue-500 hover:bg-blue-600"
                            onClick={onSelfSchedule}
                        >
                            <Calendar className="w-4 h-4" />
                            Schedule for Me
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={onRequestSchedulingHelp}
                        >
                            <HeartPulse className="w-4 h-4" />
                            Request Staff Help
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
