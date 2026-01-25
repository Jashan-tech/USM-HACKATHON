// =============================================================================
// REFREE - Zod Validation Schemas
// =============================================================================

import { z } from 'zod';

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

export const emailSchema = z.string().email('Invalid email address');

export const phoneSchema = z
  .string()
  .regex(/^[\d\s\-()]+$/, 'Invalid phone number')
  .min(10, 'Phone number must be at least 10 digits');

export const stateSchema = z.string().length(2, 'State must be 2 characters').toUpperCase();

export const npiSchema = z.string().regex(/^\d{10}$/, 'NPI must be 10 digits');

export const uuidSchema = z.string().uuid('Invalid ID format');

// =============================================================================
// AUTH SCHEMAS
// =============================================================================

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['doctor', 'patient', 'staff']),
  invite_code: z.string().optional(),
  phone: phoneSchema.optional(),
  city: z.string().optional(),
  state: stateSchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// =============================================================================
// PROFILE SCHEMAS
// =============================================================================

export const updateProfileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: phoneSchema.optional(),
  city: z.string().optional(),
  state: stateSchema.optional(),
  consent_preferences: z
    .object({
      sms: z.boolean(),
      email: z.boolean(),
      voice: z.boolean(),
    })
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// =============================================================================
// INSURANCE SCHEMAS
// =============================================================================

export const insuranceSchema = z.object({
  payer_name: z.string().min(1, 'Payer name is required'),
  payer_id: z.string().optional(),
  member_id: z.string().min(1, 'Member ID is required'),
  group_number: z.string().optional(),
  plan_type: z.string().optional(),
  priority: z.enum(['PRIMARY', 'SECONDARY']),
  coverage_start_date: z.string().optional(),
  coverage_end_date: z.string().optional(),
});

export type InsuranceInput = z.infer<typeof insuranceSchema>;

// =============================================================================
// REFERRAL SCHEMAS
// =============================================================================

export const createReferralSchema = z.object({
  patient_id: uuidSchema,
  specialist_type: z.string().min(1, 'Specialist type is required'),
  specialty_taxonomy_code: z.string().optional(),
  diagnosis_codes: z.array(z.string()).optional(),
  requested_service_codes: z.array(z.string()).optional(),
  clinical_summary: z.string().optional(),
  urgency_level: z.enum(['STAT', 'URGENT', 'ROUTINE']).default('ROUTINE'),
  referral_category: z.enum(['SPECIALIST', 'HOSPICE', 'HOME_HEALTH']).optional(),
  visit_type: z.enum(['TELEHEALTH', 'IN_PERSON']).optional(),
  telehealth_flag: z.boolean().default(false),
  city: z.string().optional(),
  state: stateSchema.optional(),
  preferred_distance_miles: z.number().int().positive().max(500).default(25),
  insurances: z.array(insuranceSchema).optional(),
  insurance_type: z
    .enum(['COMMERCIAL', 'MEDICARE', 'MEDICARE_ADVANTAGE', 'MEDICAID', 'SELF_PAY', 'OTHER'])
    .optional(),
  payer_name: z.string().optional(),
  payer_id: z.string().optional(),
  member_id: z.string().optional(),
  group_number: z.string().optional(),
  plan_type: z.string().optional(),
});

export const updateReferralSchema = z.object({
  specialist_type: z.string().optional(),
  diagnosis_codes: z.array(z.string()).optional(),
  clinical_summary: z.string().optional(),
  urgency_level: z.enum(['STAT', 'URGENT', 'ROUTINE']).optional(),
  status: z
    .enum([
      'CREATED',
      'DOCUMENTS_RECEIVED',
      'EXTRACTION_IN_PROGRESS',
      'NEEDS_REVIEW',
      'VERIFIED',
      'ELIGIBILITY_CHECKING',
      'ELIGIBILITY_CONFIRMED',
      'ELIGIBILITY_FAILED',
      'PRIOR_AUTH_REQUIRED',
      'PRIOR_AUTH_SUBMITTED',
      'PRIOR_AUTH_APPROVED',
      'PRIOR_AUTH_DENIED',
      'REFERRAL_SENT',
      'PATIENT_ACTION_NEEDED',
      'FOLLOW_UP_DUE',
      'STAFF_SCHEDULING',
      'APPOINTMENT_BOOKED',
      'APPOINTMENT_COMPLETED',
      'CLOSED_DECLINED',
      'CLOSED_INCOMPLETE',
      'CLOSED_REDIRECTED',
    ])
    .optional(),
  insurances: z.array(insuranceSchema).optional(),
  eligibility_status: z.enum(['ACTIVE', 'INACTIVE', 'UNKNOWN', 'ERROR']).optional(),
  network_status: z.enum(['IN_NETWORK', 'OUT_OF_NETWORK', 'UNKNOWN']).optional(),
  patient_responsibility_estimate: z.number().nonnegative().optional(),
  prior_auth_required: z.boolean().optional(),
  prior_auth_status: z.enum(['PENDING', 'APPROVED', 'DENIED', 'EXPIRED']).optional(),
  prior_auth_number: z.string().optional(),
  risk_level: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  risk_score: z.number().min(0).max(1).optional(),
  risk_factors: z.record(z.number()).optional(),
  follow_up_due_at: z.string().datetime().optional(),
  preferred_availability: z
    .array(
      z.object({
        day: z.string(),
        start_time: z.string(),
        end_time: z.string(),
      })
    )
    .optional(),
  selected_specialist_npi: npiSchema.optional(),
  symptoms_improved: z.boolean().optional(),
  appointment_scheduled_by_patient: z.boolean().optional(),
  patient_consent_preferences: z
    .object({
      sms: z.boolean(),
      email: z.boolean(),
      voice: z.boolean(),
    })
    .optional(),
  required_documents_checklist: z.record(z.boolean()).optional(),
});

export type CreateReferralInput = z.infer<typeof createReferralSchema>;
export type UpdateReferralInput = z.infer<typeof updateReferralSchema>;

// =============================================================================
// CHAT MESSAGE SCHEMAS
// =============================================================================

export const sendMessageSchema = z.object({
  referral_id: uuidSchema,
  message_text: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
  message_type: z.enum(['TEXT', 'TEMPLATE', 'AI_GENERATED', 'SYSTEM', 'ATTACHMENT']).default('TEXT'),
  template_id: z.string().optional(),
  attachments: z.array(z.record(z.unknown())).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// =============================================================================
// STAFF TASK SCHEMAS
// =============================================================================

export const createStaffTaskSchema = z.object({
  referral_id: uuidSchema,
  task_type: z.enum([
    'MANUAL_SCHEDULING',
    'MANUAL_ELIGIBILITY_CHECK',
    'SUBMIT_PRIOR_AUTH',
    'DOCUMENT_REVIEW',
    'CONFLICT_RESOLUTION',
    'HOSPICE_URGENT_INTAKE',
    'MANUAL_PATIENT_OUTREACH',
    'INSURANCE_VERIFICATION',
    'GENERAL',
  ]),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  instructions: z.string().optional(),
  required_fields: z.record(z.unknown()).optional(),
  required_documents: z.array(z.string()).optional(),
  required_actions: z.array(z.string()).optional(),
  sla_hours: z.number().int().positive().optional(),
});

export const updateStaffTaskSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  assigned_to: uuidSchema.optional().nullable(),
  completion_notes: z.string().optional(),
  verification_method: z.enum(['PHONE', 'PAYER_PORTAL', 'FAX', 'OTHER']).optional(),
  verification_reference: z.string().optional(),
  verification_agent_name: z.string().optional(),
  verification_notes: z.string().optional(),
});

export type CreateStaffTaskInput = z.infer<typeof createStaffTaskSchema>;
export type UpdateStaffTaskInput = z.infer<typeof updateStaffTaskSchema>;

// =============================================================================
// BOOKING SCHEMAS
// =============================================================================

export const createBookingSchema = z.object({
  referral_id: uuidSchema,
  booked_slot_start_at: z.string().datetime('Invalid start time'),
  booked_slot_end_at: z.string().datetime('Invalid end time'),
  specialist_npi: npiSchema.optional(),
  specialist_name: z.string().optional(),
  location_address: z.string().optional(),
  visit_type: z.enum(['TELEHEALTH', 'IN_PERSON']).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// =============================================================================
// SPECIALIST SEARCH SCHEMAS
// =============================================================================

export const specialistSearchSchema = z.object({
  specialty: z.string().min(1, 'Specialty is required'),
  city: z.string().optional(),
  state: stateSchema.optional(),
  limit: z.coerce.number().int().positive().max(50).default(10),
  patient_lat: z.coerce.number().optional(),
  patient_lng: z.coerce.number().optional(),
});

export type SpecialistSearchInput = z.infer<typeof specialistSearchSchema>;

// =============================================================================
// ELIGIBILITY CHECK SCHEMAS
// =============================================================================

export const eligibilityCheckSchema = z.object({
  referral_id: uuidSchema,
  payer_id: z.string().min(1, 'Payer ID is required'),
  member_id: z.string().min(1, 'Member ID is required'),
  insurance_type: z.enum([
    'COMMERCIAL',
    'MEDICARE',
    'MEDICARE_ADVANTAGE',
    'MEDICAID',
    'SELF_PAY',
    'OTHER',
  ]),
});

export type EligibilityCheckInput = z.infer<typeof eligibilityCheckSchema>;

// =============================================================================
// FOLLOW-UP RESPONSE SCHEMAS
// =============================================================================

export const followUpResponseSchema = z.object({
  symptoms_improved: z.boolean(),
  appointment_scheduled: z.boolean(),
});

export type FollowUpResponseInput = z.infer<typeof followUpResponseSchema>;

// =============================================================================
// FILE UPLOAD SCHEMAS
// =============================================================================

export const fileUploadSchema = z.object({
  referral_id: uuidSchema,
  file_type: z.enum(['INSURANCE_CARD_FRONT', 'INSURANCE_CARD_BACK', 'REFERRAL_ORDER', 'CLINICAL_NOTES', 'OTHER']),
  file_name: z.string().min(1, 'File name is required'),
  content_type: z.string().min(1, 'Content type is required'),
});

export type FileUploadInput = z.infer<typeof fileUploadSchema>;
