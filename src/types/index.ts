// =============================================================================
// NEXUS HEALTH - Referral + Intake Automation MVP
// TypeScript Type Definitions
// =============================================================================

// =============================================================================
// ENUMS
// =============================================================================

export type UserRole = 'doctor' | 'patient' | 'staff';

export type ReferralStatus =
  | 'CREATED'
  | 'DOCUMENTS_RECEIVED'
  | 'EXTRACTION_IN_PROGRESS'
  | 'NEEDS_REVIEW'
  | 'VERIFIED'
  | 'ELIGIBILITY_CHECKING'
  | 'ELIGIBILITY_CONFIRMED'
  | 'ELIGIBILITY_VERIFIED'
  | 'ELIGIBILITY_FAILED'
  | 'SCHEDULING'
  | 'PRIOR_AUTH_REQUIRED'
  | 'PRIOR_AUTH_SUBMITTED'
  | 'PRIOR_AUTH_APPROVED'
  | 'PRIOR_AUTH_DENIED'
  | 'REFERRAL_SENT'
  | 'PATIENT_ACTION_NEEDED'
  | 'FOLLOW_UP_DUE'
  | 'STAFF_SCHEDULING'
  | 'APPOINTMENT_BOOKED'
  | 'APPOINTMENT_COMPLETED'
  | 'CLOSED_DECLINED'
  | 'CLOSED_INCOMPLETE'
  | 'CLOSED_REDIRECTED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type UrgencyLevel = 'STAT' | 'URGENT' | 'ROUTINE';

export type ReferralCategory = 'SPECIALIST' | 'HOSPICE' | 'HOME_HEALTH';

export type VisitType = 'TELEHEALTH' | 'IN_PERSON';

export type InsuranceType =
  | 'COMMERCIAL'
  | 'MEDICARE'
  | 'MEDICARE_ADVANTAGE'
  | 'MEDICAID'
  | 'SELF_PAY'
  | 'OTHER';

export type EligibilityStatus = 'ACTIVE' | 'INACTIVE' | 'UNKNOWN' | 'ERROR';

export type NetworkStatus = 'IN_NETWORK' | 'OUT_OF_NETWORK' | 'UNKNOWN';

export type PriorAuthStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';

export type TaskType =
  | 'MANUAL_SCHEDULING'
  | 'MANUAL_ELIGIBILITY_CHECK'
  | 'SUBMIT_PRIOR_AUTH'
  | 'DOCUMENT_REVIEW'
  | 'CONFLICT_RESOLUTION'
  | 'HOSPICE_URGENT_INTAKE'
  | 'MANUAL_PATIENT_OUTREACH'
  | 'INSURANCE_VERIFICATION'
  | 'GENERAL';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type MessageType = 'TEXT' | 'TEMPLATE' | 'AI_GENERATED' | 'SYSTEM' | 'ATTACHMENT';

export type MessageCategory = 'FOLLOW_UP' | 'SCHEDULING' | 'INSURANCE' | 'GENERAL' | 'REMINDER';

export type VerificationMethod = 'PHONE' | 'PAYER_PORTAL' | 'FAX' | 'OTHER';

export type MetricEventType =
  | 'CREATED'
  | 'STATUS_CHANGED'
  | 'FOLLOWUP_SENT'
  | 'FOLLOWUP_RESPONDED'
  | 'APPOINTMENT_BOOKED'
  | 'APPOINTMENT_CANCELLED'
  | 'STAFF_HELP_REQUESTED'
  | 'MESSAGE_SENT'
  | 'DOCUMENT_UPLOADED'
  | 'ELIGIBILITY_CHECKED'
  | 'PRIOR_AUTH_SUBMITTED'
  | 'RISK_ESCALATED'
  | 'CONSENT_UPDATED'
  | 'FAST_TRACK_TRIGGERED';

// =============================================================================
// CORE ENTITIES
// =============================================================================

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  consent_preferences: ConsentPreferences;
  created_at: string;
  updated_at: string;
}

export interface ConsentPreferences {
  sms: boolean;
  email: boolean;
  voice: boolean;
}

export interface Insurance {
  payer_name: string;
  payer_id?: string;
  member_id: string;
  group_number?: string;
  plan_type?: string;
  priority: 'PRIMARY' | 'SECONDARY';
  coverage_start_date?: string;
  coverage_end_date?: string;
}

export interface Document {
  type: string;
  url: string;
  uploaded_at: string;
  confidence_scores?: Record<string, number>;
}

export interface ExtractionConflict {
  field: string;
  source_1: {
    type: string;
    value: string;
  };
  source_2: {
    type: string;
    value: string;
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RiskFactors {
  telehealth?: number;
  insurance_type?: number;
  insurance_type_primary?: number;
  insurance_type_secondary?: number;
  prior_auth_pending?: number;
  days_since_creation?: number;
  eligibility_issues?: number;
  high_cost?: number;
  urgency?: number;
  hospice_stat?: number;
  terminal_diagnosis?: number;
  time_sensitive?: number;
  self_pay?: number;
  out_of_network?: number;
  expired_coverage?: number;
  document_quality?: number;
  missing_insurance?: number;
  data_conflict?: number;
  dual_coverage_complexity?: number;
  eligibility_failed?: number;
}

export interface AvailabilitySlot {
  day: string;
  start_time: string;
  end_time: string;
}

export interface Referral {
  id: string;
  patient_id: string;
  doctor_id: string;
  specialist_type: string;
  specialty_taxonomy_code?: string;
  diagnosis_codes?: string[];
  requested_service_codes?: string[];
  clinical_summary?: string;
  urgency_level: UrgencyLevel;
  referral_category?: ReferralCategory;
  visit_type?: VisitType;
  telehealth_flag: boolean;
  visit_date?: string;
  city?: string;
  state?: string;
  preferred_distance_miles: number;
  insurances: Insurance[];
  insurance_type?: InsuranceType;
  payer_name?: string;
  payer_id?: string;
  member_id?: string;
  group_number?: string;
  plan_type?: string;
  coverage_start_date?: string;
  coverage_end_date?: string;
  eligibility_checked_at?: string;
  eligibility_status?: EligibilityStatus;
  eligibility_response?: Record<string, unknown>;
  network_status?: NetworkStatus;
  patient_responsibility_estimate?: number;
  prior_auth_required: boolean;
  prior_auth_submitted_at?: string;
  prior_auth_number?: string;
  prior_auth_status?: PriorAuthStatus;
  prior_auth_expiration_date?: string;
  prior_auth_denial_reason?: string;
  status: ReferralStatus;
  risk_level: RiskLevel;
  risk_score?: number;
  risk_factors?: RiskFactors;
  follow_up_due_at?: string;
  last_follow_up_sent_at?: string;
  follow_up_count: number;
  patient_consent_preferences: ConsentPreferences;
  required_documents_checklist?: Record<string, boolean>;
  documents: Document[];
  extraction_conflicts?: {
    conflicts?: ExtractionConflict[];
    low_confidence_fields?: string[];
    ocr_quality?: string;
    recommended_action?: string;
  };
  preferred_availability?: AvailabilitySlot[];
  selected_specialist_npi?: string;
  symptoms_improved?: boolean;
  appointment_scheduled_by_patient?: boolean;
  last_verified_by?: string;
  last_verified_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  last_updated_by?: string;
  // Joined fields
  patient?: Profile;
  doctor?: Profile;
  booking?: Booking;
}

export interface ChatMessage {
  id: string;
  referral_id: string;
  sender_id: string;
  sender_role: UserRole | 'system';
  message_text: string;
  message_type: MessageType;
  template_id?: string;
  attachments: Record<string, unknown>[];
  context_data?: Record<string, unknown>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  // Joined fields
  sender?: Profile;
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: MessageCategory;
  template_text: string;
  variables: string[];
  created_at: string;
}

export interface StaffTask {
  id: string;
  referral_id: string;
  task_type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  instructions?: string;
  required_fields?: Record<string, unknown>;
  required_documents?: string[];
  required_actions?: string[];
  assigned_to?: string;
  sla_hours?: number;
  sla_due_at?: string;
  started_at?: string;
  completed_at?: string;
  completion_notes?: string;
  verification_method?: VerificationMethod;
  verification_reference?: string;
  verification_agent_name?: string;
  verification_notes?: string;
  created_at: string;
  // Joined fields
  referral?: Referral;
  assignee?: Profile;
}

export interface Specialist {
  npi: string;
  first_name?: string;
  last_name?: string;
  organization_name?: string;
  specialty: string;
  taxonomy_code?: string;
  taxonomy_description?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  mips_quality_score?: number;
  patient_experience_score?: number;
  annual_service_volume?: number;
  total_beneficiaries?: number;
  average_submitted_charge?: number;
  average_allowed_amount?: number;
  estimated_wait_days?: number;
  rank_score?: number;
  last_refreshed_at?: string;
  data_sources?: string[];
  // Calculated fields
  distance_miles?: number;
  display_name?: string;
}

export interface Booking {
  id: string;
  referral_id: string;
  booked_slot_start_at: string;
  booked_slot_end_at: string;
  booked_by: 'PATIENT' | 'STAFF';
  specialist_npi?: string;
  specialist_name?: string;
  location_address?: string;
  visit_type?: VisitType;
  confirmation_number?: string;
  notes?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
}

export interface ReferralMetric {
  id: string;
  referral_id: string;
  event_type: MetricEventType;
  event_data?: Record<string, unknown>;
  actor_id?: string;
  actor_role?: string;
  created_at: string;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface CreateReferralRequest {
  patient_id: string;
  specialist_type: string;
  specialty_taxonomy_code?: string;
  diagnosis_codes?: string[];
  requested_service_codes?: string[];
  clinical_summary?: string;
  urgency_level?: UrgencyLevel;
  referral_category?: ReferralCategory;
  visit_type?: VisitType;
  telehealth_flag?: boolean;
  city?: string;
  state?: string;
  preferred_distance_miles?: number;
  insurances?: Insurance[];
  insurance_type?: InsuranceType;
  payer_name?: string;
  payer_id?: string;
  member_id?: string;
  group_number?: string;
  plan_type?: string;
}

export interface UpdateReferralRequest {
  specialist_type?: string;
  diagnosis_codes?: string[];
  clinical_summary?: string;
  urgency_level?: UrgencyLevel;
  status?: ReferralStatus;
  insurances?: Insurance[];
  eligibility_status?: EligibilityStatus;
  network_status?: NetworkStatus;
  patient_responsibility_estimate?: number;
  prior_auth_required?: boolean;
  prior_auth_status?: PriorAuthStatus;
  prior_auth_number?: string;
  risk_level?: RiskLevel;
  risk_score?: number;
  risk_factors?: RiskFactors;
  follow_up_due_at?: string;
  preferred_availability?: AvailabilitySlot[];
  selected_specialist_npi?: string;
  symptoms_improved?: boolean;
  appointment_scheduled_by_patient?: boolean;
  patient_consent_preferences?: ConsentPreferences;
  required_documents_checklist?: Record<string, boolean>;
}

export interface SpecialistSearchParams {
  specialty: string;
  city?: string;
  state?: string;
  limit?: number;
  patient_lat?: number;
  patient_lng?: number;
}

export interface SpecialistSearchResult {
  specialists: Specialist[];
  total: number;
  cached: boolean;
}

export interface EligibilityCheckRequest {
  referral_id: string;
  payer_id: string;
  member_id: string;
  insurance_type: InsuranceType;
}

export interface EligibilityCheckResponse {
  status: EligibilityStatus;
  network_status: NetworkStatus;
  coverage_active: boolean;
  patient_responsibility_estimate?: number;
  prior_auth_required?: boolean;
  benefits?: Record<string, unknown>;
  checked_at: string;
}

export interface PriorAuthRequest {
  referral_id: string;
  payer_id: string;
  service_codes: string[];
  diagnosis_codes: string[];
  clinical_notes?: string;
}

export interface CreateBookingRequest {
  referral_id: string;
  booked_slot_start_at: string;
  booked_slot_end_at: string;
  specialist_npi?: string;
  specialist_name?: string;
  location_address?: string;
  visit_type?: VisitType;
}

export interface SendMessageRequest {
  referral_id: string;
  message_text: string;
  message_type?: MessageType;
  template_id?: string;
  attachments?: Record<string, unknown>[];
}

export interface CreateStaffTaskRequest {
  referral_id: string;
  task_type: TaskType;
  priority?: TaskPriority;
  instructions?: string;
  required_fields?: Record<string, unknown>;
  required_documents?: string[];
  required_actions?: string[];
  sla_hours?: number;
}

export interface UpdateStaffTaskRequest {
  status?: TaskStatus;
  assigned_to?: string;
  completion_notes?: string;
  verification_method?: VerificationMethod;
  verification_reference?: string;
  verification_agent_name?: string;
  verification_notes?: string;
}

export interface FollowUpResponse {
  symptoms_improved: boolean;
  appointment_scheduled: boolean;
}

// =============================================================================
// DASHBOARD / ANALYTICS TYPES
// =============================================================================

export interface DashboardMetrics {
  total_referrals: number;
  active_referrals: number;
  pending_appointments: number;
  booked_appointments: number;
  average_time_to_book_days: number;
  leakage_rate: number;
  referrals_by_status: Record<ReferralStatus, number>;
  referrals_by_risk: Record<RiskLevel, number>;
  follow_ups_due_today: number;
  staff_tasks_pending: number;
}

export interface ReferralSummary {
  id: string;
  patient_name: string;
  specialist_type: string;
  status: ReferralStatus;
  risk_level: RiskLevel;
  created_at: string;
  updated_at: string;
  follow_up_due_at?: string;
  has_unread_messages: boolean;
}

// =============================================================================
// OCR / EXTRACTION TYPES
// =============================================================================

export interface OCRExtractionResult {
  extracted_fields: Record<string, string>;
  confidence_scores: Record<string, number>;
  low_confidence_fields: string[];
  ocr_quality: 'GOOD' | 'FAIR' | 'POOR';
  needs_review: boolean;
  conflicts?: ExtractionConflict[];
}

export interface InsuranceCardExtraction {
  payer_name?: string;
  member_id?: string;
  group_number?: string;
  plan_type?: string;
  subscriber_name?: string;
  effective_date?: string;
  copay_primary?: string;
  copay_specialist?: string;
  confidence_scores: Record<string, number>;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

export interface RiskConfig {
  label: string;
  color: string;
  bgColor: string;
  followUpDays: number;
}
