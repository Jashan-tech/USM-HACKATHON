import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/redis';

/**
 * GET /api/metrics
 * Get dashboard metrics for referral performance
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

        // Rate limiting
        const rateLimit = await checkRateLimit(`metrics:${user.id}`, 30, 60000);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded' },
                { status: 429 }
            );
        }

        // Get user profile to determine scope
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // Parse date range from query params
        const searchParams = request.nextUrl.searchParams;
        const daysBack = parseInt(searchParams.get('days') || '30');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);

        // Build base query filter
        let referralFilter = supabase
            .from('referrals')
            .select('*');

        if (profile.role === 'doctor') {
            referralFilter = referralFilter.eq('doctor_id', user.id);
        } else if (profile.role === 'patient') {
            referralFilter = referralFilter.eq('patient_id', user.id);
        }
        // Staff can see all

        referralFilter = referralFilter.gte('created_at', startDate.toISOString());

        const { data: referrals, error } = await referralFilter;

        if (error) {
            console.error('Error fetching referrals for metrics:', error);
            return NextResponse.json(
                { error: 'Failed to fetch metrics' },
                { status: 500 }
            );
        }

        if (!referrals || referrals.length === 0) {
            return NextResponse.json({
                data: {
                    total_referrals: 0,
                    metrics: {
                        time_to_book: { average_days: null, target: 7 },
                        leakage_rate: { rate: 0, target: 0.2 },
                        staff_touches: { average: null, target: 3 },
                    },
                    by_status: {},
                    by_risk: {},
                    trends: [],
                },
            });
        }

        // Calculate key metrics

        // 1. Time from created to booked (for booked referrals)
        const { data: bookings } = await supabase
            .from('bookings')
            .select('referral_id, created_at')
            .in(
                'referral_id',
                referrals.map((r) => r.id)
            );

        const bookingMap = new Map(
            bookings?.map((b) => [b.referral_id, new Date(b.created_at)]) || []
        );

        const bookingTimes: number[] = [];
        for (const ref of referrals) {
            const bookingDate = bookingMap.get(ref.id);
            if (bookingDate) {
                const createdDate = new Date(ref.created_at);
                const daysDiff = Math.floor(
                    (bookingDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                bookingTimes.push(daysDiff);
            }
        }

        const avgTimeToBook =
            bookingTimes.length > 0
                ? bookingTimes.reduce((a, b) => a + b, 0) / bookingTimes.length
                : null;

        // 2. Leakage rate (created > 14 days ago, not booked)
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const oldReferrals = referrals.filter(
            (r) => new Date(r.created_at) < fourteenDaysAgo
        );
        const unbookedOld = oldReferrals.filter(
            (r) =>
                !['APPOINTMENT_BOOKED', 'APPOINTMENT_COMPLETED'].includes(r.status) &&
                !bookingMap.has(r.id)
        );

        const leakageRate =
            oldReferrals.length > 0 ? unbookedOld.length / oldReferrals.length : 0;

        // 3. Staff touches per referral
        const { data: staffTasks } = await supabase
            .from('staff_scheduling_tasks')
            .select('referral_id')
            .in(
                'referral_id',
                referrals.map((r) => r.id)
            );

        const { data: messages } = await supabase
            .from('chat_messages')
            .select('referral_id')
            .in(
                'referral_id',
                referrals.map((r) => r.id)
            )
            .eq('sender_role', 'staff');

        const touchesPerReferral = new Map<string, number>();
        for (const ref of referrals) {
            touchesPerReferral.set(ref.id, 0);
        }
        for (const task of staffTasks || []) {
            const current = touchesPerReferral.get(task.referral_id) || 0;
            touchesPerReferral.set(task.referral_id, current + 1);
        }
        for (const msg of messages || []) {
            const current = touchesPerReferral.get(msg.referral_id) || 0;
            touchesPerReferral.set(msg.referral_id, current + 1);
        }

        const touchValues = Array.from(touchesPerReferral.values());
        const avgStaffTouches =
            touchValues.length > 0
                ? touchValues.reduce((a, b) => a + b, 0) / touchValues.length
                : null;

        // Count by status
        const byStatus: Record<string, number> = {};
        for (const ref of referrals) {
            byStatus[ref.status] = (byStatus[ref.status] || 0) + 1;
        }

        // Count by risk level
        const byRisk: Record<string, number> = {};
        for (const ref of referrals) {
            byRisk[ref.risk_level] = (byRisk[ref.risk_level] || 0) + 1;
        }

        // Weekly trends (last 4 weeks)
        const trends: { week: string; created: number; booked: number }[] = [];
        for (let i = 3; i >= 0; i--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() - i * 7);

            const weekReferrals = referrals.filter((r) => {
                const created = new Date(r.created_at);
                return created >= weekStart && created < weekEnd;
            });

            const weekBooked = weekReferrals.filter(
                (r) =>
                    ['APPOINTMENT_BOOKED', 'APPOINTMENT_COMPLETED'].includes(r.status) ||
                    bookingMap.has(r.id)
            );

            trends.push({
                week: weekStart.toISOString().split('T')[0],
                created: weekReferrals.length,
                booked: weekBooked.length,
            });
        }

        // Return metrics
        return NextResponse.json({
            data: {
                total_referrals: referrals.length,
                period_days: daysBack,
                metrics: {
                    time_to_book: {
                        average_days: avgTimeToBook ? Math.round(avgTimeToBook * 10) / 10 : null,
                        target: 7,
                        on_target: avgTimeToBook !== null && avgTimeToBook <= 7,
                    },
                    leakage_rate: {
                        rate: Math.round(leakageRate * 1000) / 10, // As percentage
                        target: 20, // 20%
                        on_target: leakageRate <= 0.2,
                        leaked_count: unbookedOld.length,
                        eligible_count: oldReferrals.length,
                    },
                    staff_touches: {
                        average: avgStaffTouches ? Math.round(avgStaffTouches * 10) / 10 : null,
                        target: 3,
                        on_target: avgStaffTouches !== null && avgStaffTouches <= 3,
                    },
                },
                by_status: byStatus,
                by_risk: byRisk,
                trends,
                booked_count: bookingMap.size,
                pending_count: referrals.filter(
                    (r) => !['APPOINTMENT_BOOKED', 'APPOINTMENT_COMPLETED', 'CLOSED_DECLINED', 'CLOSED_INCOMPLETE', 'CLOSED_REDIRECTED'].includes(r.status)
                ).length,
            },
        });
    } catch (error) {
        console.error('Metrics API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
