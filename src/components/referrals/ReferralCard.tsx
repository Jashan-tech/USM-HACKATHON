'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Clock,
  AlertTriangle,
  MessageSquare,
  Calendar,
  MapPin,
} from 'lucide-react';
import {
  getInitials,
  formatDate,
  getRelativeTime,
  STATUS_CONFIG,
  RISK_CONFIG,
} from '@/lib/utils';
import { Referral, ReferralStatus, RiskLevel } from '@/types';

interface ReferralCardProps {
  referral: Referral & {
    patient?: { full_name: string | null };
    booking?: { booked_slot_start_at: string } | null;
  };
  showPatientName?: boolean;
  showDoctorName?: boolean;
  hasUnreadMessages?: boolean;
}

export function ReferralCard({
  referral,
  showPatientName = true,
  showDoctorName = false,
  hasUnreadMessages = false,
}: ReferralCardProps) {
  const status = referral.status as ReferralStatus;
  const riskLevel = referral.risk_level as RiskLevel;
  const statusConfig = STATUS_CONFIG[status];
  const riskConfig = RISK_CONFIG[riskLevel];

  const isFollowUpDue =
    referral.follow_up_due_at &&
    new Date(referral.follow_up_due_at) <= new Date() &&
    !['APPOINTMENT_BOOKED', 'APPOINTMENT_COMPLETED', 'CLOSED_DECLINED', 'CLOSED_INCOMPLETE', 'CLOSED_REDIRECTED'].includes(status);

  return (
    <Link href={`/referrals/${referral.id}`}>
      <Card className="referral-card group">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {showPatientName && (
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {getInitials(referral.patient?.full_name)}
              </AvatarFallback>
            </Avatar>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                {showPatientName && (
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {referral.patient?.full_name || 'Unknown Patient'}
                  </h3>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {referral.specialist_type}
                </p>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {hasUnreadMessages && (
                  <div className="relative">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                  </div>
                )}
                <Badge
                  className={`${riskConfig.bgColor} ${riskConfig.color} text-xs`}
                >
                  {riskLevel}
                </Badge>
              </div>
            </div>

            {/* Status Row */}
            <div className="flex items-center gap-3 mt-3">
              <Badge
                variant="outline"
                className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}
              >
                {statusConfig.label}
              </Badge>

              {referral.urgency_level === 'STAT' && (
                <Badge variant="destructive" className="text-xs">
                  STAT
                </Badge>
              )}

              {referral.urgency_level === 'URGENT' && (
                <Badge variant="warning" className="text-xs bg-orange-100 text-orange-700">
                  URGENT
                </Badge>
              )}
            </div>

            {/* Meta Row */}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
              {/* Location */}
              {referral.city && referral.state && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>
                    {referral.city}, {referral.state}
                  </span>
                </div>
              )}

              {/* Booking info */}
              {referral.booking?.booked_slot_start_at && (
                <div className="flex items-center gap-1 text-green-600">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(referral.booking.booked_slot_start_at)}</span>
                </div>
              )}

              {/* Follow-up due */}
              {isFollowUpDue && (
                <div className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Follow-up due</span>
                </div>
              )}

              {/* Last updated */}
              <div className="flex items-center gap-1 ml-auto">
                <Clock className="w-3 h-3" />
                <span>{getRelativeTime(referral.updated_at)}</span>
              </div>
            </div>

            {/* Insurance info */}
            {referral.payer_name && (
              <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Insurance: {referral.payer_name}
                {referral.eligibility_status && (
                  <span
                    className={
                      referral.eligibility_status === 'ACTIVE'
                        ? 'text-green-500'
                        : 'text-red-500'
                    }
                  >
                    {' '}
                    ({referral.eligibility_status})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CRITICAL indicator */}
        {riskLevel === 'CRITICAL' && (
          <div className="absolute top-0 right-0 w-1 h-full bg-red-500 rounded-r-2xl" />
        )}
      </Card>
    </Link>
  );
}
