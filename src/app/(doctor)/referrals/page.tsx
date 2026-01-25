import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { FileText, Search, Filter, Plus } from 'lucide-react';
import { ReferralCard } from '@/components/referrals/ReferralCard';
import { STATUS_CONFIG, RISK_CONFIG } from '@/lib/utils';
import { ReferralStatus, RiskLevel } from '@/types';

interface PageProps {
  searchParams: { status?: string; risk?: string; search?: string };
}

export default async function ReferralsPage({ searchParams }: PageProps) {
  // DEMO MODE: Hardcoded demo referrals for hackathon presentation
  const demoReferrals = [
    { id: 'ref-001', status: 'CREATED', risk_level: 'CRITICAL', specialist_type: 'Hospice Care', patient: { full_name: 'Margaret Johnson' }, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), booking: null },
    { id: 'ref-002', status: 'PRIOR_AUTH_REQUIRED', risk_level: 'HIGH', specialist_type: 'Cardiology', patient: { full_name: 'Robert Williams' }, created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), booking: null },
    { id: 'ref-003', status: 'APPOINTMENT_BOOKED', risk_level: 'LOW', specialist_type: 'Orthopedics', patient: { full_name: 'Sarah Chen' }, created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), booking: { booked_slot_start_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() } },
    { id: 'ref-004', status: 'NEEDS_REVIEW', risk_level: 'HIGH', specialist_type: 'Oncology', patient: { full_name: 'James Wilson' }, created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), booking: null },
    { id: 'ref-005', status: 'SCHEDULING', risk_level: 'MEDIUM', specialist_type: 'Gastroenterology', patient: { full_name: 'Maria Garcia' }, created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), booking: null },
    { id: 'ref-006', status: 'APPOINTMENT_BOOKED', risk_level: 'MEDIUM', specialist_type: 'Dermatology', patient: { full_name: 'David Lee' }, created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), booking: { booked_slot_start_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() } },
    { id: 'ref-007', status: 'ELIGIBILITY_VERIFIED', risk_level: 'LOW', specialist_type: 'Pulmonology', patient: { full_name: 'Emily Brown' }, created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), booking: null },
    { id: 'ref-008', status: 'PRIOR_AUTH_REQUIRED', risk_level: 'CRITICAL', specialist_type: 'Neurology', patient: { full_name: 'Michael Thompson' }, created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), booking: null },
    { id: 'ref-009', status: 'APPOINTMENT_BOOKED', risk_level: 'LOW', specialist_type: 'Endocrinology', patient: { full_name: 'Jennifer Davis' }, created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), booking: { booked_slot_start_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() } },
    { id: 'ref-010', status: 'SCHEDULING', risk_level: 'MEDIUM', specialist_type: 'Rheumatology', patient: { full_name: 'William Anderson' }, created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), booking: null },
    { id: 'ref-011', status: 'NEEDS_REVIEW', risk_level: 'CRITICAL', specialist_type: 'Nephrology', patient: { full_name: 'Elizabeth Martinez' }, created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), booking: null },
    { id: 'ref-012', status: 'CREATED', risk_level: 'HIGH', specialist_type: 'Psychiatry', patient: { full_name: 'Christopher Taylor' }, created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), booking: null },
  ];

  // Apply filters
  let referrals = [...demoReferrals];

  if (searchParams.status) {
    referrals = referrals.filter(r => r.status === searchParams.status);
  }

  if (searchParams.risk) {
    referrals = referrals.filter(r => r.risk_level === searchParams.risk);
  }

  // Calculate status counts for filters
  const statusCountMap = demoReferrals.reduce(
    (acc, ref) => {
      acc[ref.status] = (acc[ref.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Referrals
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage and track your patient referrals
          </p>
        </div>
        <Link href="/referrals/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Referral
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search patients..."
            className="pl-10"
            defaultValue={searchParams.search}
          />
        </div>

        {/* Status Filter */}
        <Select defaultValue={searchParams.status || 'all'}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
                {statusCountMap[key] ? ` (${statusCountMap[key]})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Risk Filter */}
        <Select defaultValue={searchParams.risk || 'all'}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Risk Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk</SelectItem>
            {Object.entries(RISK_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Quick Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Link href="/referrals">
          <Button
            variant={!searchParams.status && !searchParams.risk ? 'default' : 'outline'}
            size="sm"
          >
            All ({referrals?.length || 0})
          </Button>
        </Link>
        <Link href="/referrals?risk=CRITICAL">
          <Button
            variant={searchParams.risk === 'CRITICAL' ? 'default' : 'outline'}
            size="sm"
            className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200"
          >
            Critical
          </Button>
        </Link>
        <Link href="/referrals?risk=HIGH">
          <Button
            variant={searchParams.risk === 'HIGH' ? 'default' : 'outline'}
            size="sm"
            className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200"
          >
            High Risk
          </Button>
        </Link>
        <Link href="/referrals?status=NEEDS_REVIEW">
          <Button
            variant={searchParams.status === 'NEEDS_REVIEW' ? 'default' : 'outline'}
            size="sm"
          >
            Needs Review
          </Button>
        </Link>
        <Link href="/referrals?status=PRIOR_AUTH_REQUIRED">
          <Button
            variant={searchParams.status === 'PRIOR_AUTH_REQUIRED' ? 'default' : 'outline'}
            size="sm"
          >
            Prior Auth Pending
          </Button>
        </Link>
        <Link href="/referrals?status=APPOINTMENT_BOOKED">
          <Button
            variant={searchParams.status === 'APPOINTMENT_BOOKED' ? 'default' : 'outline'}
            size="sm"
            className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200"
          >
            Booked
          </Button>
        </Link>
      </div>

      {/* Referrals Grid */}
      {referrals && referrals.length > 0 ? (
        <div className="card-grid">
          {referrals.map((referral) => (
            <ReferralCard
              key={referral.id}
              referral={referral as any}
              showPatientName={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No referrals found
          </h3>
          <p className="text-gray-500 mb-6">
            {searchParams.status || searchParams.risk
              ? 'Try adjusting your filters'
              : 'Create your first referral to get started'}
          </p>
          {!searchParams.status && !searchParams.risk && (
            <Link href="/referrals/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Referral
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
