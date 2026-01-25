'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ConsentSectionProps {
    userId: string;
}

interface ReferralConsent {
    id: string;
    specialist_type: string;
    patient_consent_preferences: {
        sms: boolean;
        email: boolean;
        voice: boolean;
    };
}

export function ConsentSection({ userId }: ConsentSectionProps) {
    const [referrals, setReferrals] = useState<ReferralConsent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const supabase = createBrowserSupabaseClient();
    const { toast } = useToast();

    useEffect(() => {
        async function fetchReferrals() {
            try {
                const { data, error } = await supabase
                    .from('referrals')
                    .select('id, specialist_type, patient_consent_preferences')
                    .eq('patient_id', userId)
                    .not('status', 'in', '("CLOSED_COMPLETED","CLOSED_DECLINED")'); // Active referrals

                if (error) throw error;
                setReferrals(data || []);
            } catch (error) {
                console.error('Error fetching consent info:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchReferrals();
    }, [userId, supabase]);

    async function handleToggle(referralId: string, channel: 'sms' | 'email' | 'voice', checked: boolean) {
        // Optimistic update
        setReferrals(prev => prev.map(r => {
            if (r.id === referralId) {
                return {
                    ...r,
                    patient_consent_preferences: {
                        ...r.patient_consent_preferences,
                        [channel]: checked
                    }
                };
            }
            return r;
        }));

        try {
            // Find current state to merge? Or just push update
            const referral = referrals.find(r => r.id === referralId);
            if (!referral) return;

            const newPrefs = {
                ...referral.patient_consent_preferences,
                [channel]: checked
            };

            const { error } = await supabase
                .from('referrals')
                .update({
                    patient_consent_preferences: newPrefs
                })
                .eq('id', referralId);

            if (error) throw error;

            toast({
                title: 'Preferences Updated',
                description: `Your ${channel.toUpperCase()} consent preference has been saved.`,
            });

        } catch (error) {
            console.error('Error updating consent:', error);
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: 'Failed to save preference. Please try again.',
            });

            // Revert optimistic update (simplest is to refetch, but here just warning user)
        }
    }

    if (isLoading) {
        return <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

    if (referrals.length === 0) {
        return null;
    }

    return (
        <div className="space-y-6">
            {referrals.map((referral) => {
                const prefs = referral.patient_consent_preferences || { sms: false, email: false, voice: false };

                return (
                    <Card key={referral.id}>
                        <CardHeader>
                            <CardTitle className="text-base">
                                {referral.specialist_type} Referral Preferences
                            </CardTitle>
                            <CardDescription>
                                Manage how we contact you regarding this referral
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>SMS Notifications</Label>
                                    <p className="text-sm text-gray-500">Receive appointment reminders via text</p>
                                </div>
                                <Switch
                                    checked={prefs.sms}
                                    onCheckedChange={(c) => handleToggle(referral.id, 'sms', c)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Email Updates</Label>
                                    <p className="text-sm text-gray-500">Receive documents and status updates</p>
                                </div>
                                <Switch
                                    checked={prefs.email}
                                    onCheckedChange={(c) => handleToggle(referral.id, 'email', c)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Voice Calls</Label>
                                    <p className="text-sm text-gray-500">Allow automated voice calls for urgent items</p>
                                </div>
                                <Switch
                                    checked={prefs.voice}
                                    onCheckedChange={(c) => handleToggle(referral.id, 'voice', c)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
