// =============================================================================
// REFREE - Scheduling Agent Service
// Handles availability matching and appointment booking
// =============================================================================

import { AvailabilitySlot, Specialist, Booking } from '@/types';

// =============================================================================
// MOCK OFFICE HOURS
// In production, these would come from specialist/practice management systems
// =============================================================================

interface OfficeHours {
  [day: string]: { open: string; close: string } | null;
}

const DEFAULT_OFFICE_HOURS: OfficeHours = {
  monday: { open: '09:00', close: '17:00' },
  tuesday: { open: '09:00', close: '17:00' },
  wednesday: { open: '09:00', close: '17:00' },
  thursday: { open: '09:00', close: '17:00' },
  friday: { open: '09:00', close: '15:00' },
  saturday: null, // Closed
  sunday: null, // Closed
};

// Standard appointment durations by specialty (minutes)
const APPOINTMENT_DURATIONS: Record<string, number> = {
  Cardiology: 45,
  Orthopedics: 30,
  Gastroenterology: 30,
  Pulmonology: 45,
  Psychiatry: 60,
  Nephrology: 45,
  Endocrinology: 45,
  Dermatology: 20,
  Radiology: 15,
  'Hospice Care': 90,
  default: 30,
};

// =============================================================================
// AVAILABILITY PARSING
// =============================================================================

/**
 * Parse natural language availability into structured slots
 * In production, use OpenAI function calling for better parsing
 */
export function parseAvailability(text: string): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  const lowerText = text.toLowerCase();

  // Day patterns
  const dayPatterns: { pattern: RegExp; days: string[] }[] = [
    { pattern: /monday/i, days: ['monday'] },
    { pattern: /tuesday/i, days: ['tuesday'] },
    { pattern: /wednesday/i, days: ['wednesday'] },
    { pattern: /thursday/i, days: ['thursday'] },
    { pattern: /friday/i, days: ['friday'] },
    { pattern: /weekday/i, days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    { pattern: /weekend/i, days: ['saturday', 'sunday'] },
    { pattern: /any day/i, days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
  ];

  // Time patterns
  const timePatterns: { pattern: RegExp; start: string; end: string }[] = [
    { pattern: /morning/i, start: '09:00', end: '12:00' },
    { pattern: /afternoon/i, start: '12:00', end: '17:00' },
    { pattern: /evening/i, start: '17:00', end: '19:00' },
    { pattern: /any time/i, start: '09:00', end: '17:00' },
    { pattern: /before noon/i, start: '09:00', end: '12:00' },
    { pattern: /after noon/i, start: '12:00', end: '17:00' },
    { pattern: /early/i, start: '09:00', end: '11:00' },
    { pattern: /late/i, start: '15:00', end: '17:00' },
  ];

  // Find matching days
  let matchedDays: string[] = [];
  for (const { pattern, days } of dayPatterns) {
    if (pattern.test(lowerText)) {
      matchedDays = [...matchedDays, ...days];
    }
  }

  // Default to weekdays if no days matched
  if (matchedDays.length === 0) {
    matchedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  }

  // Remove duplicates
  matchedDays = Array.from(new Set(matchedDays));

  // Find matching time ranges
  let matchedTimes: { start: string; end: string }[] = [];
  for (const { pattern, start, end } of timePatterns) {
    if (pattern.test(lowerText)) {
      matchedTimes.push({ start, end });
    }
  }

  // Default to full day if no times matched
  if (matchedTimes.length === 0) {
    matchedTimes = [{ start: '09:00', end: '17:00' }];
  }

  // Combine days and times
  for (const day of matchedDays) {
    for (const { start, end } of matchedTimes) {
      slots.push({ day, start_time: start, end_time: end });
    }
  }

  return slots;
}

// =============================================================================
// SLOT MATCHING
// =============================================================================

export interface AvailableSlot {
  date: Date;
  start_time: string;
  end_time: string;
  formatted: string;
}

/**
 * Find available appointment slots that match patient availability
 */
export function findMatchingSlots(
  patientAvailability: AvailabilitySlot[],
  specialist: Specialist,
  officeHours: OfficeHours = DEFAULT_OFFICE_HOURS,
  maxSlots: number = 6
): AvailableSlot[] {
  const slots: AvailableSlot[] = [];
  const specialty = specialist.specialty || 'default';
  const appointmentDuration = APPOINTMENT_DURATIONS[specialty] || APPOINTMENT_DURATIONS.default;
  const estimatedWaitDays = specialist.estimated_wait_days || 7;

  // Start from earliest available date
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + estimatedWaitDays);

  // Look up to 30 days out
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 30);

  const currentDate = new Date(startDate);

  while (currentDate <= endDate && slots.length < maxSlots) {
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dayHours = officeHours[dayName];

    // Check if office is open this day
    if (dayHours) {
      // Check if patient is available this day
      const patientDaySlots = patientAvailability.filter(
        (slot) => slot.day.toLowerCase() === dayName
      );

      if (patientDaySlots.length > 0 || patientAvailability.length === 0) {
        // Find overlapping time slots
        const availableSlot = findOverlappingSlot(
          dayHours,
          patientDaySlots.length > 0 ? patientDaySlots : null,
          appointmentDuration
        );

        if (availableSlot) {
          const formattedDate = currentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          });

          slots.push({
            date: new Date(currentDate),
            start_time: availableSlot.start,
            end_time: availableSlot.end,
            formatted: `${formattedDate} at ${formatTime(availableSlot.start)}`,
          });
        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return slots;
}

function findOverlappingSlot(
  officeHours: { open: string; close: string },
  patientSlots: AvailabilitySlot[] | null,
  durationMinutes: number
): { start: string; end: string } | null {
  const officeOpen = timeToMinutes(officeHours.open);
  const officeClose = timeToMinutes(officeHours.close);

  if (patientSlots && patientSlots.length > 0) {
    // Find overlap between patient availability and office hours
    for (const slot of patientSlots) {
      const patientStart = timeToMinutes(slot.start_time);
      const patientEnd = timeToMinutes(slot.end_time);

      const overlapStart = Math.max(officeOpen, patientStart);
      const overlapEnd = Math.min(officeClose, patientEnd);

      if (overlapEnd - overlapStart >= durationMinutes) {
        // Return first available slot in overlap
        return {
          start: minutesToTime(overlapStart),
          end: minutesToTime(overlapStart + durationMinutes),
        };
      }
    }
  } else {
    // No patient constraints, return first available slot
    if (officeClose - officeOpen >= durationMinutes) {
      return {
        start: officeHours.open,
        end: minutesToTime(officeOpen + durationMinutes),
      };
    }
  }

  return null;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// =============================================================================
// BOOKING CREATION
// =============================================================================

export interface BookingRequest {
  referral_id: string;
  slot: AvailableSlot;
  specialist: Specialist;
  booked_by: 'PATIENT' | 'STAFF';
  visit_type?: 'TELEHEALTH' | 'IN_PERSON';
}

/**
 * Create a booking record
 */
export function createBookingData(request: BookingRequest): Omit<Booking, 'id' | 'created_at'> {
  const { referral_id, slot, specialist, booked_by, visit_type } = request;

  const startAt = new Date(slot.date);
  const [startHours, startMinutes] = slot.start_time.split(':').map(Number);
  startAt.setHours(startHours, startMinutes, 0, 0);

  const endAt = new Date(slot.date);
  const [endHours, endMinutes] = slot.end_time.split(':').map(Number);
  endAt.setHours(endHours, endMinutes, 0, 0);

  const specialistName = specialist.organization_name ||
    `Dr. ${specialist.first_name} ${specialist.last_name}`;

  const locationAddress = specialist.address_line1
    ? `${specialist.address_line1}, ${specialist.city}, ${specialist.state} ${specialist.postal_code}`
    : undefined;

  return {
    referral_id,
    booked_slot_start_at: startAt.toISOString(),
    booked_slot_end_at: endAt.toISOString(),
    booked_by,
    specialist_npi: specialist.npi,
    specialist_name: specialistName,
    location_address: locationAddress,
    visit_type: visit_type || 'IN_PERSON',
    confirmation_number: generateConfirmationNumber(),
  };
}

function generateConfirmationNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// =============================================================================
// AUTO-BOOKING FOR STAFF
// =============================================================================

/**
 * Find the earliest available slot and create booking
 */
export function findEarliestSlot(
  patientAvailability: AvailabilitySlot[],
  specialist: Specialist
): AvailableSlot | null {
  const slots = findMatchingSlots(patientAvailability, specialist, DEFAULT_OFFICE_HOURS, 1);
  return slots.length > 0 ? slots[0] : null;
}
