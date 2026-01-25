// =============================================================================
// REFREE - Utility Functions
// =============================================================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  ReferralStatus,
  RiskLevel,
  StatusConfig,
  RiskConfig,
  TaskPriority,
} from '@/types';

/**
 * Merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// =============================================================================
// STATUS CONFIGURATION
// =============================================================================

export const STATUS_CONFIG: Record<ReferralStatus, StatusConfig> = {
  CREATED: {
    label: 'Created',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    description: 'Referral has been created',
  },
  DOCUMENTS_RECEIVED: {
    label: 'Documents Received',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    description: 'Documents have been uploaded',
  },
  EXTRACTION_IN_PROGRESS: {
    label: 'Extracting',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description: 'Processing documents',
  },
  NEEDS_REVIEW: {
    label: 'Needs Review',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    description: 'Manual review required',
  },
  VERIFIED: {
    label: 'Verified',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    description: 'Information verified',
  },
  ELIGIBILITY_CHECKING: {
    label: 'Checking Eligibility',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description: 'Verifying insurance coverage',
  },
  ELIGIBILITY_CONFIRMED: {
    label: 'Eligibility Confirmed',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    description: 'Insurance coverage confirmed',
  },
  ELIGIBILITY_VERIFIED: {
    label: 'Eligibility Verified',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    description: 'Insurance eligibility verified',
  },
  SCHEDULING: {
    label: 'Scheduling',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description: 'Appointment scheduling in progress',
  },
  ELIGIBILITY_FAILED: {
    label: 'Eligibility Failed',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    description: 'Insurance verification failed',
  },
  PRIOR_AUTH_REQUIRED: {
    label: 'Prior Auth Required',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    description: 'Prior authorization needed',
  },
  PRIOR_AUTH_SUBMITTED: {
    label: 'Prior Auth Submitted',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description: 'Awaiting authorization',
  },
  PRIOR_AUTH_APPROVED: {
    label: 'Prior Auth Approved',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    description: 'Authorization approved',
  },
  PRIOR_AUTH_DENIED: {
    label: 'Prior Auth Denied',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    description: 'Authorization denied',
  },
  REFERRAL_SENT: {
    label: 'Referral Sent',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description: 'Referral sent to specialist',
  },
  PATIENT_ACTION_NEEDED: {
    label: 'Patient Action Needed',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    description: 'Waiting for patient',
  },
  FOLLOW_UP_DUE: {
    label: 'Follow-up Due',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    description: 'Follow-up required',
  },
  STAFF_SCHEDULING: {
    label: 'Staff Scheduling',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    description: 'Staff assisting with scheduling',
  },
  APPOINTMENT_BOOKED: {
    label: 'Appointment Booked',
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
    description: 'Appointment scheduled',
  },
  APPOINTMENT_COMPLETED: {
    label: 'Completed',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    description: 'Visit completed',
  },
  CLOSED_DECLINED: {
    label: 'Declined',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    description: 'Patient declined referral',
  },
  CLOSED_INCOMPLETE: {
    label: 'Incomplete',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    description: 'Referral not completed',
  },
  CLOSED_REDIRECTED: {
    label: 'Redirected',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    description: 'Referral redirected',
  },
};

// =============================================================================
// RISK CONFIGURATION
// =============================================================================

export const RISK_CONFIG: Record<RiskLevel, RiskConfig> = {
  LOW: {
    label: 'Low Risk',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    followUpDays: 10,
  },
  MEDIUM: {
    label: 'Medium Risk',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    followUpDays: 5,
  },
  HIGH: {
    label: 'High Risk',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    followUpDays: 2,
  },
  CRITICAL: {
    label: 'Critical',
    color: 'text-red-900',
    bgColor: 'bg-red-200',
    followUpDays: 1,
  },
};

// =============================================================================
// PRIORITY CONFIGURATION
// =============================================================================

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  LOW: {
    label: 'Low',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  MEDIUM: {
    label: 'Medium',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  HIGH: {
    label: 'High',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  CRITICAL: {
    label: 'Critical',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
};

// =============================================================================
// DATE UTILITIES
// =============================================================================

/**
 * Format a date string to a human-readable format
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date string with time
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffMs < 0) {
    // Past
    if (diffMins > -60) return `${Math.abs(diffMins)} minutes ago`;
    if (diffHours > -24) return `${Math.abs(diffHours)} hours ago`;
    if (diffDays > -7) return `${Math.abs(diffDays)} days ago`;
    return formatDate(dateString);
  } else {
    // Future
    if (diffMins < 60) return `in ${diffMins} minutes`;
    if (diffHours < 24) return `in ${diffHours} hours`;
    if (diffDays < 7) return `in ${diffDays} days`;
    return formatDate(dateString);
  }
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const diffMs = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffMs / 86400000);
}

/**
 * Add hours to a date
 */
export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600000);
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

// =============================================================================
// STRING UTILITIES
// =============================================================================

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Format a phone number
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return 'N/A';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Mask a member ID for display (show last 4 digits)
 */
export function maskMemberId(memberId: string): string {
  if (memberId.length <= 4) return memberId;
  return '***' + memberId.slice(-4);
}

/**
 * Get initials from a name
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// =============================================================================
// GEOLOCATION UTILITIES
// =============================================================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Check if a string is a valid NPI (10-digit)
 */
export function isValidNPI(npi: string): boolean {
  return /^\d{10}$/.test(npi);
}

/**
 * Check if a string is a valid email
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

// =============================================================================
// CURRENCY UTILITIES
// =============================================================================

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// =============================================================================
// ARRAY UTILITIES
// =============================================================================

/**
 * Group an array by a key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Sort an array by multiple keys
 */
export function sortBy<T>(array: T[], ...keys: (keyof T)[]): T[] {
  return [...array].sort((a, b) => {
    for (const key of keys) {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
    }
    return 0;
  });
}
