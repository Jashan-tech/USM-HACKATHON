import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { formatDate, getRelativeTime, STATUS_CONFIG, RISK_CONFIG } from '@/lib/utils';
import { ReferralStatus, RiskLevel } from '@/types';

export default async function DoctorDashboard() {
  // DEMO MODE: Use hardcoded demo data for hackathon presentation

  // Demo referrals data with various statuses and risk levels
  const demoReferrals = [
    { id: 'ref-001', status: 'CREATED', risk_level: 'CRITICAL', specialist_type: 'Hospice Care', patient: { full_name: 'Margaret Johnson' }, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), follow_up_due_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
    { id: 'ref-002', status: 'PRIOR_AUTH_REQUIRED', risk_level: 'HIGH', specialist_type: 'Cardiology', patient: { full_name: 'Robert Williams' }, created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), follow_up_due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() },
    { id: 'ref-003', status: 'APPOINTMENT_BOOKED', risk_level: 'LOW', specialist_type: 'Orthopedics', patient: { full_name: 'Sarah Chen' }, created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
    { id: 'ref-004', status: 'NEEDS_REVIEW', risk_level: 'HIGH', specialist_type: 'Oncology', patient: { full_name: 'James Wilson' }, created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), follow_up_due_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
    { id: 'ref-005', status: 'SCHEDULING', risk_level: 'MEDIUM', specialist_type: 'Gastroenterology', patient: { full_name: 'Maria Garcia' }, created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
    { id: 'ref-006', status: 'APPOINTMENT_BOOKED', risk_level: 'MEDIUM', specialist_type: 'Dermatology', patient: { full_name: 'David Lee' }, created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
    { id: 'ref-007', status: 'ELIGIBILITY_VERIFIED', risk_level: 'LOW', specialist_type: 'Pulmonology', patient: { full_name: 'Emily Brown' }, created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
    { id: 'ref-008', status: 'PRIOR_AUTH_REQUIRED', risk_level: 'CRITICAL', specialist_type: 'Neurology', patient: { full_name: 'Michael Thompson' }, created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), follow_up_due_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() },
    { id: 'ref-009', status: 'APPOINTMENT_BOOKED', risk_level: 'LOW', specialist_type: 'Endocrinology', patient: { full_name: 'Jennifer Davis' }, created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString() },
    { id: 'ref-010', status: 'SCHEDULING', risk_level: 'MEDIUM', specialist_type: 'Rheumatology', patient: { full_name: 'William Anderson' }, created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
    { id: 'ref-011', status: 'NEEDS_REVIEW', risk_level: 'CRITICAL', specialist_type: 'Nephrology', patient: { full_name: 'Elizabeth Martinez' }, created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), follow_up_due_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    { id: 'ref-012', status: 'CREATED', risk_level: 'HIGH', specialist_type: 'Psychiatry', patient: { full_name: 'Christopher Taylor' }, created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
  ];

  // Calculate demo stats
  const totalReferrals = demoReferrals.length;
  const pendingReferrals = demoReferrals.filter(r => !['APPOINTMENT_BOOKED', 'APPOINTMENT_COMPLETED', 'CLOSED_DECLINED'].includes(r.status)).length;
  const bookedReferrals = demoReferrals.filter(r => r.status === 'APPOINTMENT_BOOKED').length;

  // Follow-ups due (referrals with follow_up_due_at in the past)
  const followUpsDue = demoReferrals
    .filter(r => r.follow_up_due_at && new Date(r.follow_up_due_at) <= new Date())
    .sort((a, b) => new Date(a.follow_up_due_at!).getTime() - new Date(b.follow_up_due_at!).getTime())
    .slice(0, 5);

  // Recent referrals (sorted by created_at)
  const recentReferrals = [...demoReferrals]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Calculate risk counts
  const riskCounts = demoReferrals.reduce(
    (acc, ref) => {
      const level = ref.risk_level as RiskLevel;
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    },
    {} as Partial<Record<RiskLevel, number>>
  );

  const criticalCount = riskCounts.CRITICAL || 0;
  const highRiskCount = riskCounts.HIGH || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Overview of your referral activity
          </p>
        </div>
        <Link href="/referrals/new">
          <Button className="gap-2">
            <FileText className="w-4 h-4" />
            New Referral
          </Button>
        </Link>
      </div>

      {/* Alert for critical referrals */}
      {criticalCount > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-red-800 dark:text-red-200">
              {criticalCount} critical referral{criticalCount > 1 ? 's' : ''} need
              immediate attention
            </p>
            <p className="text-sm text-red-600 dark:text-red-300">
              These referrals are at high risk of not completing
            </p>
          </div>
          <Link href="/referrals?risk=CRITICAL">
            <Button variant="destructive" size="sm">
              View Now
            </Button>
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Referrals
            </CardTitle>
            <FileText className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalReferrals || 0}</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pending
            </CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {pendingReferrals || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Awaiting completion</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Booked
            </CardTitle>
            <Calendar className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {bookedReferrals || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Appointments scheduled</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              High Risk
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {criticalCount + highRiskCount}
            </div>
            <p className="text-xs text-gray-500 mt-1">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Follow-ups Due */}
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Follow-ups Due
              </CardTitle>
              <Link href="/referrals?filter=follow_up_due">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {followUpsDue && followUpsDue.length > 0 ? (
              <div className="space-y-3">
                {followUpsDue.map((referral: any) => (
                  <Link
                    key={referral.id}
                    href={`/referrals/${referral.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {referral.patient?.full_name || 'Unknown Patient'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {referral.specialist_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          RISK_CONFIG[referral.risk_level as RiskLevel].bgColor +
                          ' ' +
                          RISK_CONFIG[referral.risk_level as RiskLevel].color
                        }
                      >
                        {referral.risk_level}
                      </Badge>
                      <span className="text-sm text-amber-600 dark:text-amber-400">
                        {getRelativeTime(referral.follow_up_due_at)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                <p>No follow-ups due</p>
                <p className="text-sm">You're all caught up!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Referrals */}
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Recent Referrals
              </CardTitle>
              <Link href="/referrals">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentReferrals && recentReferrals.length > 0 ? (
              <div className="space-y-3">
                {recentReferrals.map((referral: any) => (
                  <Link
                    key={referral.id}
                    href={`/referrals/${referral.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {referral.patient?.full_name || 'Unknown Patient'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {referral.specialist_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          STATUS_CONFIG[referral.status as ReferralStatus].bgColor +
                          ' ' +
                          STATUS_CONFIG[referral.status as ReferralStatus].color
                        }
                      >
                        {STATUS_CONFIG[referral.status as ReferralStatus].label}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No referrals yet</p>
                <Link href="/referrals/new">
                  <Button variant="outline" size="sm" className="mt-2">
                    Create Your First Referral
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as RiskLevel[]).map(
              (level) => (
                <div
                  key={level}
                  className={`p-4 rounded-2xl ${RISK_CONFIG[level].bgColor}`}
                >
                  <p
                    className={`text-2xl font-bold ${RISK_CONFIG[level].color}`}
                  >
                    {riskCounts[level] || 0}
                  </p>
                  <p className={`text-sm ${RISK_CONFIG[level].color} opacity-80`}>
                    {level}
                  </p>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
