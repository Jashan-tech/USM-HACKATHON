-- =============================================================================
-- NEXUS HEALTH - Referral + Intake Automation MVP
-- Database Schema
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. PROFILES TABLE
-- Stores user profile information linked to Supabase Auth
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('doctor', 'patient', 'staff')),
  full_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  state VARCHAR(2),
  -- Consent preferences for automated communications
  consent_preferences JSONB DEFAULT '{"sms": false, "email": false, "voice": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- =============================================================================
-- 2. DOCTOR INVITE CODES TABLE
-- Manages invite codes for doctor signup
-- =============================================================================
CREATE TABLE IF NOT EXISTS doctor_invite_codes (
  code TEXT PRIMARY KEY,
  used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial invite codes
INSERT INTO doctor_invite_codes (code) VALUES
  ('DEMO2026'),
  ('PILOT001'),
  ('BETA123'),
  ('NEXUS01'),
  ('HEALTH99')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 3. REFERRALS TABLE (ENHANCED)
-- Main referral tracking table with all Phase 1/2 enhancements
-- =============================================================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core relationships
  patient_id UUID NOT NULL REFERENCES auth.users(id),
  doctor_id UUID NOT NULL REFERENCES auth.users(id),

  -- Referral details
  specialist_type TEXT NOT NULL,
  specialty_taxonomy_code VARCHAR(10),
  diagnosis_codes TEXT[], -- ICD-10 codes
  requested_service_codes TEXT[], -- CPT/HCPCS codes
  clinical_summary TEXT,
  urgency_level TEXT DEFAULT 'ROUTINE' CHECK (urgency_level IN ('STAT', 'URGENT', 'ROUTINE')),
  referral_category TEXT CHECK (referral_category IN ('SPECIALIST', 'HOSPICE', 'HOME_HEALTH')),

  -- Visit context
  visit_type TEXT CHECK (visit_type IN ('TELEHEALTH', 'IN_PERSON')),
  telehealth_flag BOOLEAN DEFAULT FALSE,
  visit_date DATE,

  -- Location
  city TEXT,
  state VARCHAR(2),
  preferred_distance_miles INTEGER DEFAULT 25,

  -- PHASE 1/2 ENHANCEMENT: Multiple Insurances (Coordination of Benefits)
  insurances JSONB DEFAULT '[]',

  -- Legacy single insurance fields (deprecated, kept for migration)
  insurance_type TEXT,
  payer_name TEXT,
  payer_id VARCHAR(50),
  member_id VARCHAR(50),
  group_number VARCHAR(50),
  plan_type TEXT,
  coverage_start_date DATE,
  coverage_end_date DATE,

  -- Eligibility tracking
  eligibility_checked_at TIMESTAMPTZ,
  eligibility_status TEXT CHECK (eligibility_status IN ('ACTIVE', 'INACTIVE', 'UNKNOWN', 'ERROR')),
  eligibility_response JSONB,
  network_status TEXT CHECK (network_status IN ('IN_NETWORK', 'OUT_OF_NETWORK', 'UNKNOWN')),
  patient_responsibility_estimate DECIMAL(10, 2),

  -- Prior authorization tracking
  prior_auth_required BOOLEAN DEFAULT FALSE,
  prior_auth_submitted_at TIMESTAMPTZ,
  prior_auth_number VARCHAR(50),
  prior_auth_status TEXT CHECK (prior_auth_status IN ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED')),
  prior_auth_expiration_date DATE,
  prior_auth_denial_reason TEXT,

  -- Status & workflow
  status TEXT DEFAULT 'CREATED' CHECK (status IN (
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
    'CLOSED_REDIRECTED'
  )),

  -- Risk scoring
  risk_level TEXT DEFAULT 'MEDIUM' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  risk_score DECIMAL(5, 2) CHECK (risk_score >= 0 AND risk_score <= 1),
  risk_factors JSONB,

  -- Follow-up timing
  follow_up_due_at TIMESTAMPTZ,
  last_follow_up_sent_at TIMESTAMPTZ,
  follow_up_count INTEGER DEFAULT 0,

  -- PHASE 1/2 ENHANCEMENT: Explicit Consent Tracking
  patient_consent_preferences JSONB DEFAULT '{"sms": false, "email": false, "voice": false}',

  -- PHASE 1/2 ENHANCEMENT: Dynamic Checklist for Hospice/Specialty Forms
  required_documents_checklist JSONB,

  -- Document tracking
  documents JSONB DEFAULT '[]',
  extraction_conflicts JSONB,

  -- Scheduling
  preferred_availability JSONB,
  selected_specialist_npi VARCHAR(10),

  -- Follow-up responses
  symptoms_improved BOOLEAN,
  appointment_scheduled_by_patient BOOLEAN,

  -- PHASE 1/2 ENHANCEMENT: Accountability Audit
  last_verified_by UUID REFERENCES auth.users(id),
  last_verified_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_referrals_patient ON referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_referrals_doctor ON referrals(doctor_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_risk ON referrals(risk_level, risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_follow_up ON referrals(follow_up_due_at) WHERE follow_up_due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referrals_category ON referrals(referral_category, urgency_level);
CREATE INDEX IF NOT EXISTS idx_referrals_urgency ON referrals(urgency_level) WHERE urgency_level = 'STAT';
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at DESC);

-- =============================================================================
-- 4. CHAT MESSAGES TABLE
-- Stores real-time messages between doctors and patients
-- =============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('doctor', 'patient', 'staff', 'system')),
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'TEMPLATE', 'AI_GENERATED', 'SYSTEM', 'ATTACHMENT')),
  template_id TEXT,
  attachments JSONB DEFAULT '[]',
  context_data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_referral ON chat_messages(referral_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages(referral_id, is_read) WHERE is_read = FALSE;

-- =============================================================================
-- 5. MESSAGE TEMPLATES TABLE
-- Pre-built templates for common messages
-- =============================================================================
CREATE TABLE IF NOT EXISTS message_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('FOLLOW_UP', 'SCHEDULING', 'INSURANCE', 'GENERAL', 'REMINDER')),
  template_text TEXT NOT NULL,
  variables TEXT[], -- List of variable names like ['patient_name', 'specialist_type']
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed message templates
INSERT INTO message_templates (id, name, category, template_text, variables) VALUES
  ('follow_up_initial', 'Initial Follow-up', 'FOLLOW_UP',
   'Hi {{patient_name}}, we wanted to check in on your referral to {{specialist_type}}. Have you been able to schedule your appointment yet?',
   ARRAY['patient_name', 'specialist_type']),
  ('follow_up_reminder', 'Follow-up Reminder', 'FOLLOW_UP',
   'Hi {{patient_name}}, this is a friendly reminder about your pending referral to {{specialist_type}}. Let us know if you need help scheduling.',
   ARRAY['patient_name', 'specialist_type']),
  ('scheduling_offer', 'Scheduling Assistance', 'SCHEDULING',
   'Hi {{patient_name}}, we can help you schedule your appointment with {{specialist_name}}. Would you like us to book a slot for you?',
   ARRAY['patient_name', 'specialist_name']),
  ('insurance_update', 'Insurance Update', 'INSURANCE',
   'Hi {{patient_name}}, we have an update regarding your insurance for the {{specialist_type}} referral. Please check your referral details.',
   ARRAY['patient_name', 'specialist_type']),
  ('appointment_confirmed', 'Appointment Confirmed', 'GENERAL',
   'Great news, {{patient_name}}! Your appointment with {{specialist_name}} is confirmed for {{appointment_date}} at {{appointment_time}}.',
   ARRAY['patient_name', 'specialist_name', 'appointment_date', 'appointment_time']),
  ('preventive_care', 'Preventive Care Reminder', 'REMINDER',
   'Hi {{patient_name}}, even though your symptoms may have improved, completing your {{specialist_type}} visit can help prevent future issues and ensure comprehensive care.',
   ARRAY['patient_name', 'specialist_type'])
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 6. STAFF SCHEDULING TASKS TABLE
-- Tasks created for staff intervention
-- =============================================================================
CREATE TABLE IF NOT EXISTS staff_scheduling_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN (
    'MANUAL_SCHEDULING',
    'MANUAL_ELIGIBILITY_CHECK',
    'SUBMIT_PRIOR_AUTH',
    'DOCUMENT_REVIEW',
    'CONFLICT_RESOLUTION',
    'HOSPICE_URGENT_INTAKE',
    'MANUAL_PATIENT_OUTREACH',
    'INSURANCE_VERIFICATION',
    'GENERAL'
  )),
  priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  instructions TEXT,
  required_fields JSONB,
  required_documents JSONB,
  required_actions TEXT[],
  assigned_to UUID REFERENCES auth.users(id),
  sla_hours INTEGER, -- Hours until SLA breach
  sla_due_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  -- Manual verification fields
  verification_method TEXT CHECK (verification_method IN ('PHONE', 'PAYER_PORTAL', 'FAX', 'OTHER')),
  verification_reference TEXT,
  verification_agent_name TEXT,
  verification_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_tasks_referral ON staff_scheduling_tasks(referral_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON staff_scheduling_tasks(status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_priority ON staff_scheduling_tasks(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned ON staff_scheduling_tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_tasks_sla ON staff_scheduling_tasks(sla_due_at) WHERE sla_due_at IS NOT NULL;

-- =============================================================================
-- 7. SPECIALIST CACHE TABLE
-- Cached specialist data from NPPES + CMS datasets
-- =============================================================================
CREATE TABLE IF NOT EXISTS specialist_cache (
  npi VARCHAR(10) PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  organization_name TEXT,
  specialty TEXT,
  taxonomy_code VARCHAR(10),
  taxonomy_description TEXT,
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state VARCHAR(2),
  postal_code VARCHAR(10),
  phone TEXT,
  -- Geocoding (for distance calculation)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  -- CMS Quality Scores
  mips_quality_score DECIMAL(5, 2),
  patient_experience_score DECIMAL(5, 2),
  -- Utilization data
  annual_service_volume INTEGER,
  total_beneficiaries INTEGER,
  average_submitted_charge DECIMAL(12, 2),
  average_allowed_amount DECIMAL(12, 2),
  -- Calculated fields
  estimated_wait_days INTEGER,
  rank_score DECIMAL(5, 2),
  -- Metadata
  last_refreshed_at TIMESTAMPTZ DEFAULT NOW(),
  data_sources TEXT[] -- e.g., ['NPPES', 'PHYSICIAN_COMPARE', 'PROVIDER_UTILIZATION']
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_specialist_specialty ON specialist_cache(specialty);
CREATE INDEX IF NOT EXISTS idx_specialist_location ON specialist_cache(state, city);
CREATE INDEX IF NOT EXISTS idx_specialist_rank ON specialist_cache(rank_score DESC NULLS LAST);

-- =============================================================================
-- 8. BOOKINGS TABLE
-- Tracks scheduled appointments
-- =============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL UNIQUE REFERENCES referrals(id) ON DELETE CASCADE,
  booked_slot_start_at TIMESTAMPTZ NOT NULL,
  booked_slot_end_at TIMESTAMPTZ NOT NULL,
  booked_by TEXT NOT NULL CHECK (booked_by IN ('PATIENT', 'STAFF')),
  specialist_npi VARCHAR(10),
  specialist_name TEXT,
  location_address TEXT,
  visit_type TEXT CHECK (visit_type IN ('TELEHEALTH', 'IN_PERSON')),
  confirmation_number TEXT,
  notes TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bookings_referral ON bookings(referral_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(booked_slot_start_at);

-- =============================================================================
-- 9. REFERRAL METRICS TABLE
-- Event tracking for analytics
-- =============================================================================
CREATE TABLE IF NOT EXISTS referral_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'CREATED',
    'STATUS_CHANGED',
    'FOLLOWUP_SENT',
    'FOLLOWUP_RESPONDED',
    'APPOINTMENT_BOOKED',
    'APPOINTMENT_CANCELLED',
    'STAFF_HELP_REQUESTED',
    'MESSAGE_SENT',
    'DOCUMENT_UPLOADED',
    'ELIGIBILITY_CHECKED',
    'PRIOR_AUTH_SUBMITTED',
    'RISK_ESCALATED',
    'CONSENT_UPDATED',
    'FAST_TRACK_TRIGGERED'
  )),
  event_data JSONB,
  actor_id UUID REFERENCES auth.users(id),
  actor_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_referral_metrics_referral ON referral_metrics(referral_id, event_type);
CREATE INDEX IF NOT EXISTS idx_referral_metrics_type ON referral_metrics(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_referral_metrics_created ON referral_metrics(created_at DESC);

-- =============================================================================
-- 10. AUDIT LOG TABLE
-- Comprehensive audit trail for compliance
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  actor_id UUID REFERENCES auth.users(id),
  actor_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_referrals_updated_at ON referrals;
CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate follow-up due date based on risk level
CREATE OR REPLACE FUNCTION calculate_follow_up_due_at(risk_level TEXT)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN CASE risk_level
    WHEN 'CRITICAL' THEN NOW() + INTERVAL '1 day'
    WHEN 'HIGH' THEN NOW() + INTERVAL '2 days'
    WHEN 'MEDIUM' THEN NOW() + INTERVAL '5 days'
    WHEN 'LOW' THEN NOW() + INTERVAL '10 days'
    ELSE NOW() + INTERVAL '5 days'
  END;
END;
$$ LANGUAGE plpgsql;
