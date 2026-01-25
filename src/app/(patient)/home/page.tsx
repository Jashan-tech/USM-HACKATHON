import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
    FileText,
    Calendar,
    MessageSquare,
    Clock,
    ArrowRight,
    CheckCircle,
    AlertCircle,
    HelpCircle,
    Users,
} from 'lucide-react';
import { formatDate, getRelativeTime, STATUS_CONFIG, RISK_CONFIG } from '@/lib/utils';
import { ReferralStatus, RiskLevel } from '@/types';

export default async function PatientHomePage() {
    const supabase = await createServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        // If not logged in, redirect to login
        redirect('/login');
    }

    // Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('id', user.id)
        .single();

    if (!profile) {
        return (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Profile not found
                </h3>
                <p className="text-gray-500">
                    Please contact support to set up your account
                </p>
            </div>
        );
    }

    // Fetch patient referrals
    const { data: referrals, error } = await supabase
        .from('referrals')
        .select(
            `
                *,
                doctor:profiles!referrals_doctor_id_fkey(full_name),
                booking:bookings(*)
            `
        )
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching referrals:', error);
        return (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Error loading referrals
                </h3>
                <p className="text-gray-500">
                    Unable to load referrals. Please try again later.
                </p>
            </div>
        );
    }

    // Count unread messages (this would require a separate query to chat_messages table)
    // For now, we'll set it to 0, but in a real implementation you'd query for unread messages
    const unreadCount = 0; // Placeholder - would need to implement actual unread message counting

    // Get action-needed referrals
    const actionNeeded = referrals?.filter((r) =>
        ['PATIENT_ACTION_NEEDED', 'FOLLOW_UP_DUE', 'REFERRAL_SENT'].includes(r.status)
    ) || [];

    const upcomingAppointments = referrals?.filter((r) =>
        r.booking?.booked_slot_start_at &&
        new Date(r.booking.booked_slot_start_at) > new Date()
    ) || [];

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl p-6 text-white">
                <h1 className="text-2xl font-bold mb-2">
                    Welcome back, {profile.full_name?.split(' ')[0] || 'there'}!
                </h1>
                <p className="text-blue-100">
                    Manage your referrals and stay connected with your care team.
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="rounded-2xl">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {referrals?.length || 0}
                            </p>
                            <p className="text-sm text-gray-500">Referrals</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                            <AlertCircle className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {actionNeeded.length}
                            </p>
                            <p className="text-sm text-gray-500">Need Action</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                            <Calendar className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {upcomingAppointments.length}
                            </p>
                            <p className="text-sm text-gray-500">Upcoming</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                            <MessageSquare className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {unreadCount || 0}
                            </p>
                            <p className="text-sm text-gray-500">New Messages</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Action Needed Section */}
            {actionNeeded.length > 0 && (
                <Card className="rounded-2xl border-orange-200 bg-orange-50 dark:bg-orange-900/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                            <AlertCircle className="w-5 h-5" />
                            Action Needed
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {actionNeeded.slice(0, 3).map((referral) => (
                            <Link
                                key={referral.id}
                                href={`/referrals/${referral.id}`}
                                className="block p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {referral.specialist_type}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            From Dr. {referral.doctor?.full_name || 'Unknown'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            className={STATUS_CONFIG[referral.status as ReferralStatus]?.color || 'bg-gray-100 text-gray-700'}
                                        >
                                            {STATUS_CONFIG[referral.status as ReferralStatus]?.label || referral.status}
                                        </Badge>
                                        <ArrowRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* All Referrals */}
            <Card className="rounded-2xl">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-500" />
                            Your Referrals
                        </CardTitle>
                        <Link href="/referrals">
                            <Button variant="outline" size="sm">
                                View All
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent>
                    {referrals && referrals.length > 0 ? (
                        <div className="space-y-3">
                            {referrals.slice(0, 5).map((referral) => {
                                const statusConfig = STATUS_CONFIG[referral.status as ReferralStatus];
                                const riskConfig = RISK_CONFIG[referral.risk_level as RiskLevel];
                                const isBooked = referral.booking?.booked_slot_start_at;

                                return (
                                    <Link
                                        key={referral.id}
                                        href={`/referrals/${referral.id}`}
                                        className="block p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {referral.specialist_type}
                                                    </p>
                                                    {isBooked && (
                                                        <Badge className="bg-green-100 text-green-700">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Booked
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 mb-2">
                                                    {referral.clinical_summary?.slice(0, 80) || 'No summary provided'}
                                                    {(referral.clinical_summary?.length || 0) > 80 ? '...' : ''}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{getRelativeTime(referral.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <Badge className={statusConfig?.color || 'bg-gray-100'}>
                                                    {statusConfig?.label || referral.status}
                                                </Badge>
                                                <Badge variant="outline" className={riskConfig?.color || ''}>
                                                    {riskConfig?.label || referral.risk_level}
                                                </Badge>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-gray-500">No referrals yet</p>
                            <p className="text-sm text-gray-400 mt-1">
                                Your doctor will create referrals when needed
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/referrals">
                    <Card className="rounded-2xl hover:shadow-lg transition-shadow cursor-pointer h-full">
                        <CardContent className="p-6 flex flex-col items-center text-center">
                            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-4">
                                <Users className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                View Specialists
                            </h3>
                            <p className="text-sm text-gray-500">
                                Browse recommended specialists for your referrals
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/messages">
                    <Card className="rounded-2xl hover:shadow-lg transition-shadow cursor-pointer h-full">
                        <CardContent className="p-6 flex flex-col items-center text-center">
                            <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-2xl mb-4">
                                <MessageSquare className="w-8 h-8 text-purple-600" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                Messages
                            </h3>
                            <p className="text-sm text-gray-500">
                                Chat with your doctor about your referrals
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/settings">
                    <Card className="rounded-2xl hover:shadow-lg transition-shadow cursor-pointer h-full">
                        <CardContent className="p-6 flex flex-col items-center text-center">
                            <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-2xl mb-4">
                                <HelpCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                Get Help
                            </h3>
                            <p className="text-sm text-gray-500">
                                Request staff assistance with scheduling
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
