-- =============================================================================
-- REFREE - Referral + Intake Automation MVP
-- Seed Data - 10 Synthetic Scenarios
-- =============================================================================

-- NOTE: This seed file creates test data. In production, users are created via
-- Supabase Auth. For testing, we'll use these UUIDs to create matching profiles.

-- =============================================================================
-- TEST USER PROFILES
-- Creating auth users first to satisfying FK constraints
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'doctor@test.com', crypt(gen_random_uuid()::text, gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'staff@test.com', crypt(gen_random_uuid()::text, gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'jane.doe@test.com', crypt(gen_random_uuid()::text, gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'john.smith@test.com', crypt(gen_random_uuid()::text, gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'authenticated', 'authenticated', 'maria.garcia@test.com', crypt(gen_random_uuid()::text, gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'authenticated', 'authenticated', 'robert.johnson@test.com', crypt(gen_random_uuid()::text, gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'authenticated', 'authenticated', 'sarah.lee@test.com', crypt(gen_random_uuid()::text, gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'authenticated', 'authenticated', 'david.kim@test.com', crypt(gen_random_uuid()::text, gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'elizabeth.brown@test.com', crypt(gen_random_uuid()::text, gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'carlos.martinez@test.com', crypt(gen_random_uuid()::text, gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'anna.kowalski@test.com', crypt(gen_random_uuid()::text, gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'michael.obrien@test.com', crypt(gen_random_uuid()::text, gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Doctor user (UUID to be replaced with actual auth user ID)
INSERT INTO profiles (id, role, full_name, email, phone, city, state) VALUES
  ('11111111-1111-1111-1111-111111111111', 'doctor', 'Dr. Sarah Mitchell', 'doctor@test.com', '555-100-0001', 'Boston', 'MA')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email;

-- Staff user
INSERT INTO profiles (id, role, full_name, email, phone, city, state) VALUES
  ('22222222-2222-2222-2222-222222222222', 'staff', 'Mark Thompson', 'staff@test.com', '555-100-0002', 'Boston', 'MA')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email;

-- Patient profiles for scenarios
INSERT INTO profiles (id, role, full_name, email, phone, city, state, consent_preferences) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'patient', 'Jane Doe', 'jane.doe@test.com', '555-200-0001', 'Cambridge', 'MA', '{"sms": true, "email": true, "voice": false}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'patient', 'John Smith', 'john.smith@test.com', '555-200-0002', 'Somerville', 'MA', '{"sms": true, "email": true, "voice": true}'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'patient', 'Maria Garcia', 'maria.garcia@test.com', '555-200-0003', 'Brookline', 'MA', '{"sms": true, "email": true, "voice": false}'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'patient', 'Robert Johnson', 'robert.johnson@test.com', '555-200-0004', 'Newton', 'MA', '{"sms": true, "email": true, "voice": true}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'patient', 'Sarah Lee', 'sarah.lee@test.com', '555-200-0005', 'Quincy', 'MA', '{"sms": false, "email": true, "voice": false}'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'patient', 'David Kim', 'david.kim@test.com', '555-200-0006', 'Medford', 'MA', '{"sms": true, "email": true, "voice": false}'),
  ('00000000-0000-0000-0000-000000000001', 'patient', 'Elizabeth Brown', 'elizabeth.brown@test.com', '555-200-0007', 'Wellesley', 'MA', '{"sms": true, "email": true, "voice": true}'),
  ('00000000-0000-0000-0000-000000000002', 'patient', 'Carlos Martinez', 'carlos.martinez@test.com', '555-200-0008', 'Waltham', 'MA', '{"sms": true, "email": true, "voice": false}'),
  ('00000000-0000-0000-0000-000000000003', 'patient', 'Anna Kowalski', 'anna.kowalski@test.com', '555-200-0009', 'Arlington', 'MA', '{"sms": false, "email": false, "voice": false}'),
  ('00000000-0000-0000-0000-000000000004', 'patient', 'Michael O''Brien', 'michael.obrien@test.com', '555-200-0010', 'Lexington', 'MA', '{"sms": true, "email": true, "voice": true}')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  consent_preferences = EXCLUDED.consent_preferences;

-- =============================================================================
-- SCENARIO 1: Clean Happy Path
-- Jane Doe, commercial insurance, cardiology, low risk
-- Expected: SUCCESS - straightforward referral completion
-- =============================================================================
INSERT INTO referrals (
  id, patient_id, doctor_id,
  specialist_type, specialty_taxonomy_code, diagnosis_codes, requested_service_codes,
  clinical_summary, urgency_level, referral_category,
  visit_type, telehealth_flag, city, state, preferred_distance_miles,
  insurances,
  insurance_type, payer_name, payer_id, member_id, group_number, plan_type,
  eligibility_status, network_status, patient_responsibility_estimate,
  status, risk_level, risk_score, risk_factors,
  follow_up_due_at,
  patient_consent_preferences,
  created_at
) VALUES (
  'a0000001-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Cardiology', '207RC0000X', ARRAY['I10', 'R00.0'], ARRAY['93000', '93015'],
  'Patient presents with elevated blood pressure and occasional palpitations. Requesting cardiac evaluation.',
  'ROUTINE', 'SPECIALIST',
  'IN_PERSON', FALSE, 'Cambridge', 'MA', 25,
  '[{"payer_name": "Blue Cross Blue Shield", "payer_id": "BCBS001", "member_id": "XYZ123456789", "group_number": "GRP001", "plan_type": "PPO", "priority": "PRIMARY", "coverage_start_date": "2024-01-01"}]',
  'COMMERCIAL', 'Blue Cross Blue Shield', 'BCBS001', 'XYZ123456789', 'GRP001', 'PPO',
  'ACTIVE', 'IN_NETWORK', 50.00,
  'ELIGIBILITY_CONFIRMED', 'LOW', 0.15, '{"insurance_type": 0.05, "days_since_creation": 0.10}',
  NOW() + INTERVAL '10 days',
  '{"sms": true, "email": true, "voice": false}',
  NOW() - INTERVAL '1 day'
);

-- =============================================================================
-- SCENARIO 2: Unreadable Insurance Card
-- John Smith, blurry image, needs manual review
-- Expected: NEEDS_REVIEW - staff must verify insurance manually
-- =============================================================================
INSERT INTO referrals (
  id, patient_id, doctor_id,
  specialist_type, diagnosis_codes, clinical_summary, urgency_level, referral_category,
  visit_type, city, state,
  documents, extraction_conflicts,
  status, risk_level, risk_score, risk_factors,
  follow_up_due_at,
  patient_consent_preferences,
  created_at
) VALUES (
  'a0000002-0000-0000-0000-000000000002',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  'Orthopedics', ARRAY['M54.5'], 'Chronic lower back pain, requesting specialist evaluation.',
  'ROUTINE', 'SPECIALIST',
  'IN_PERSON', 'Somerville', 'MA',
  '[{"type": "INSURANCE_CARD_FRONT", "url": "/uploads/john_smith_card.jpg", "uploaded_at": "2024-01-15T10:00:00Z", "confidence_scores": {"payer_name": 0.45, "member_id": 0.32, "group_number": 0.28}}]',
  '{"low_confidence_fields": ["payer_name", "member_id", "group_number"], "ocr_quality": "POOR", "recommended_action": "MANUAL_ENTRY"}',
  'NEEDS_REVIEW', 'MEDIUM', 0.45, '{"document_quality": 0.25, "missing_insurance": 0.20}',
  NOW() + INTERVAL '5 days',
  '{"sms": true, "email": true, "voice": true}',
  NOW() - INTERVAL '2 days'
);

-- Create staff task for Scenario 2
INSERT INTO staff_scheduling_tasks (
  id, referral_id, task_type, priority, status, instructions, required_fields
) VALUES (
  'b0000002-0000-0000-0000-000000000002',
  'a0000002-0000-0000-0000-000000000002',
  'DOCUMENT_REVIEW', 'MEDIUM', 'PENDING',
  'Insurance card image is unreadable (confidence <50%). Please verify insurance information via phone or payer portal.',
  '{"fields": ["payer_name", "member_id", "group_number", "plan_type"]}'
);

-- =============================================================================
-- SCENARIO 3: Conflicting DOB
-- Maria Garcia, card vs order mismatch
-- Expected: NEEDS_REVIEW - conflict resolution required
-- =============================================================================
INSERT INTO referrals (
  id, patient_id, doctor_id,
  specialist_type, diagnosis_codes, clinical_summary, urgency_level, referral_category,
  visit_type, city, state,
  insurances,
  insurance_type, payer_name, member_id,
  documents, extraction_conflicts,
  status, risk_level, risk_score, risk_factors,
  follow_up_due_at,
  patient_consent_preferences,
  created_at
) VALUES (
  'a0000003-0000-0000-0000-000000000003',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '11111111-1111-1111-1111-111111111111',
  'Dermatology', ARRAY['L40.0'], 'Psoriasis evaluation and treatment plan.',
  'ROUTINE', 'SPECIALIST',
  'IN_PERSON', 'Brookline', 'MA',
  '[{"payer_name": "Aetna", "member_id": "W987654321", "group_number": "GRP789", "plan_type": "HMO", "priority": "PRIMARY"}]',
  'COMMERCIAL', 'Aetna', 'W987654321',
  '[{"type": "INSURANCE_CARD_FRONT", "confidence_scores": {"member_id": 0.95, "dob": 0.92}}, {"type": "REFERRAL_ORDER", "confidence_scores": {"patient_dob": 0.98}}]',
  '{"conflicts": [{"field": "patient_dob", "source_1": {"type": "INSURANCE_CARD", "value": "1985-03-15"}, "source_2": {"type": "REFERRAL_ORDER", "value": "1985-03-16"}, "severity": "HIGH"}], "recommended_action": "MANUAL_VERIFICATION"}',
  'NEEDS_REVIEW', 'HIGH', 0.55, '{"data_conflict": 0.30, "insurance_type": 0.10, "days_since_creation": 0.15}',
  NOW() + INTERVAL '2 days',
  '{"sms": true, "email": true, "voice": false}',
  NOW() - INTERVAL '3 days'
);

-- Create staff task for Scenario 3
INSERT INTO staff_scheduling_tasks (
  id, referral_id, task_type, priority, status, instructions, required_fields
) VALUES (
  'b0000003-0000-0000-0000-000000000003',
  'a0000003-0000-0000-0000-000000000003',
  'CONFLICT_RESOLUTION', 'HIGH', 'PENDING',
  'Date of birth mismatch between insurance card (03/15/1985) and referral order (03/16/1985). Verify correct DOB with patient and update records.',
  '{"conflicts": ["patient_dob"], "sources": ["INSURANCE_CARD", "REFERRAL_ORDER"]}'
);

-- =============================================================================
-- SCENARIO 4: Dual Coverage
-- Robert Johnson, Medicare + Medicaid (PRIMARY/SECONDARY)
-- Expected: SUCCESS with coordination of benefits handling
-- =============================================================================
INSERT INTO referrals (
  id, patient_id, doctor_id,
  specialist_type, diagnosis_codes, clinical_summary, urgency_level, referral_category,
  visit_type, city, state,
  insurances,
  eligibility_status, network_status, patient_responsibility_estimate,
  status, risk_level, risk_score, risk_factors,
  follow_up_due_at,
  patient_consent_preferences,
  created_at
) VALUES (
  'a0000004-0000-0000-0000-000000000004',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '11111111-1111-1111-1111-111111111111',
  'Nephrology', ARRAY['N18.3', 'I10'], 'CKD Stage 3 management and monitoring.',
  'ROUTINE', 'SPECIALIST',
  'IN_PERSON', 'Newton', 'MA',
  '[
    {"payer_name": "Medicare", "payer_id": "MEDICARE", "member_id": "1EG4-TE5-MK72", "plan_type": "MEDICARE_ORIGINAL", "priority": "PRIMARY", "coverage_start_date": "2020-01-01"},
    {"payer_name": "MassHealth", "payer_id": "MASSHEALTH", "member_id": "MH123456", "plan_type": "MEDICAID", "priority": "SECONDARY", "coverage_start_date": "2020-06-01"}
  ]',
  'ACTIVE', 'IN_NETWORK', 0.00,
  'ELIGIBILITY_CONFIRMED', 'MEDIUM', 0.40, '{"insurance_type_primary": 0.10, "insurance_type_secondary": 0.20, "dual_coverage_complexity": 0.10}',
  NOW() + INTERVAL '5 days',
  '{"sms": true, "email": true, "voice": true}',
  NOW() - INTERVAL '1 day'
);

-- =============================================================================
-- SCENARIO 5: Out-of-Network Specialist
-- Sarah Lee, Aetna HMO, specialist not in network
-- Expected: ELIGIBILITY_FAILED - need to find in-network alternative
-- =============================================================================
INSERT INTO referrals (
  id, patient_id, doctor_id,
  specialist_type, diagnosis_codes, clinical_summary, urgency_level, referral_category,
  visit_type, city, state,
  insurances,
  insurance_type, payer_name, payer_id, member_id, group_number, plan_type,
  eligibility_status, eligibility_checked_at, network_status, patient_responsibility_estimate,
  selected_specialist_npi,
  status, risk_level, risk_score, risk_factors,
  follow_up_due_at,
  patient_consent_preferences,
  created_at
) VALUES (
  'a0000005-0000-0000-0000-000000000005',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '11111111-1111-1111-1111-111111111111',
  'Gastroenterology', ARRAY['K21.0', 'R10.9'], 'GERD symptoms, requesting GI evaluation.',
  'ROUTINE', 'SPECIALIST',
  'IN_PERSON', 'Quincy', 'MA',
  '[{"payer_name": "Aetna", "payer_id": "AETNA", "member_id": "W555666777", "group_number": "HMO001", "plan_type": "HMO", "priority": "PRIMARY"}]',
  'COMMERCIAL', 'Aetna', 'AETNA', 'W555666777', 'HMO001', 'HMO',
  'ACTIVE', NOW() - INTERVAL '1 hour', 'OUT_OF_NETWORK', 2500.00,
  '1234567890',
  'ELIGIBILITY_FAILED', 'HIGH', 0.65, '{"out_of_network": 0.30, "high_cost": 0.20, "insurance_type": 0.05, "days_since_creation": 0.10}',
  NOW() + INTERVAL '2 days',
  '{"sms": false, "email": true, "voice": false}',
  NOW() - INTERVAL '3 days'
);

-- =============================================================================
-- SCENARIO 6: Prior Auth Required, Missing CPT
-- David Kim, UnitedHealthcare, MRI
-- Expected: PRIOR_AUTH_REQUIRED - staff must submit prior auth
-- =============================================================================
INSERT INTO referrals (
  id, patient_id, doctor_id,
  specialist_type, diagnosis_codes, requested_service_codes, clinical_summary, urgency_level, referral_category,
  visit_type, city, state,
  insurances,
  insurance_type, payer_name, payer_id, member_id, group_number, plan_type,
  eligibility_status, network_status,
  prior_auth_required, prior_auth_status,
  status, risk_level, risk_score, risk_factors,
  follow_up_due_at,
  patient_consent_preferences,
  created_at
) VALUES (
  'a0000006-0000-0000-0000-000000000006',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '11111111-1111-1111-1111-111111111111',
  'Radiology', ARRAY['M54.16', 'M51.16'], ARRAY['72148'],
  'Lumbar spine MRI for evaluation of radiculopathy.',
  'URGENT', 'SPECIALIST',
  'IN_PERSON', 'Medford', 'MA',
  '[{"payer_name": "UnitedHealthcare", "payer_id": "UHC", "member_id": "U888999000", "group_number": "CORP500", "plan_type": "PPO", "priority": "PRIMARY"}]',
  'COMMERCIAL', 'UnitedHealthcare', 'UHC', 'U888999000', 'CORP500', 'PPO',
  'ACTIVE', 'IN_NETWORK',
  TRUE, 'PENDING',
  'PRIOR_AUTH_REQUIRED', 'HIGH', 0.60, '{"prior_auth_pending": 0.25, "urgency": 0.15, "insurance_type": 0.05, "days_since_creation": 0.15}',
  NOW() + INTERVAL '2 days',
  '{"sms": true, "email": true, "voice": false}',
  NOW() - INTERVAL '4 days'
);

-- Create staff task for Scenario 6
INSERT INTO staff_scheduling_tasks (
  id, referral_id, task_type, priority, status, instructions, required_fields, required_documents
) VALUES (
  'b0000006-0000-0000-0000-000000000006',
  'a0000006-0000-0000-0000-000000000006',
  'SUBMIT_PRIOR_AUTH', 'HIGH', 'PENDING',
  'Prior authorization required for MRI (CPT 72148). UnitedHealthcare requires clinical documentation. Submit via UHC provider portal or CoverMyMeds.',
  '{"cpt_codes": ["72148"], "icd_codes": ["M54.16", "M51.16"], "payer": "UnitedHealthcare"}',
  '["clinical_notes", "imaging_order", "conservative_treatment_documentation"]'
);

-- =============================================================================
-- SCENARIO 7: Hospice Urgent with Fast-Track
-- Elizabeth Brown, age 82, STAT urgency, CRITICAL risk
-- Expected: FAST_TRACK - immediate routing to intake nurse queue
-- =============================================================================
INSERT INTO referrals (
  id, patient_id, doctor_id,
  specialist_type, specialty_taxonomy_code, diagnosis_codes, clinical_summary,
  urgency_level, referral_category,
  visit_type, city, state,
  insurances,
  insurance_type, payer_name,
  required_documents_checklist,
  status, risk_level, risk_score, risk_factors,
  follow_up_due_at,
  patient_consent_preferences,
  created_at
) VALUES (
  'a0000007-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'Hospice Care', '251G00000X', ARRAY['C34.90', 'J44.1'],
  'Terminal lung cancer with COPD. Patient and family have elected hospice care. Prognosis <6 months. Requires urgent hospice evaluation.',
  'STAT', 'HOSPICE',
  'IN_PERSON', 'Wellesley', 'MA',
  '[{"payer_name": "Medicare", "payer_id": "MEDICARE", "member_id": "1AB2-CD3-EF45", "plan_type": "MEDICARE_HOSPICE", "priority": "PRIMARY"}]',
  'MEDICARE', 'Medicare',
  '{"terminal_cert": false, "physician_orders": false, "dnr": false, "advance_directive": false, "medication_list": false}',
  'CREATED', 'CRITICAL', 0.95, '{"hospice_stat": 0.50, "terminal_diagnosis": 0.30, "time_sensitive": 0.15}',
  NOW() + INTERVAL '4 hours',
  '{"sms": true, "email": true, "voice": true}',
  NOW()
);

-- Create CRITICAL staff task for Scenario 7
INSERT INTO staff_scheduling_tasks (
  id, referral_id, task_type, priority, status, instructions, required_documents, required_actions, sla_hours, sla_due_at
) VALUES (
  'b0000007-0000-0000-0000-000000000007',
  'a0000007-0000-0000-0000-000000000007',
  'HOSPICE_URGENT_INTAKE', 'CRITICAL', 'PENDING',
  'STAT HOSPICE REFERRAL - Terminal patient (82F, lung cancer). Immediate intake required within 24 hours. Complete required documents checklist and expedite eligibility verification. BYPASS standard queues.',
  '["terminal_cert", "physician_orders", "dnr", "advance_directive", "medication_list"]',
  ARRAY['Verify Medicare Hospice Benefit eligibility', 'Obtain terminal certification', 'Collect advance directives', 'Schedule initial hospice visit', 'Contact family for consent'],
  24,
  NOW() + INTERVAL '24 hours'
);

-- Add metric event for fast-track
INSERT INTO referral_metrics (referral_id, event_type, event_data, created_at) VALUES
  ('a0000007-0000-0000-0000-000000000007', 'FAST_TRACK_TRIGGERED', '{"reason": "STAT_HOSPICE", "sla_hours": 24}', NOW());

-- =============================================================================
-- SCENARIO 8: Telehealth + Medicaid
-- Carlos Martinez, psychiatry, HIGH risk
-- Expected: HIGH risk due to telehealth + Medicaid combination
-- =============================================================================
INSERT INTO referrals (
  id, patient_id, doctor_id,
  specialist_type, diagnosis_codes, clinical_summary, urgency_level, referral_category,
  visit_type, telehealth_flag, city, state,
  insurances,
  insurance_type, payer_name, payer_id, member_id, plan_type,
  eligibility_status, network_status,
  status, risk_level, risk_score, risk_factors,
  follow_up_due_at,
  patient_consent_preferences,
  created_at
) VALUES (
  'a0000008-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'Psychiatry', ARRAY['F32.1', 'F41.1'], 'Major depression with anxiety. Requesting psychiatric evaluation for medication management.',
  'URGENT', 'SPECIALIST',
  'TELEHEALTH', TRUE, 'Waltham', 'MA',
  '[{"payer_name": "MassHealth", "payer_id": "MASSHEALTH", "member_id": "MH789012", "plan_type": "MEDICAID", "priority": "PRIMARY"}]',
  'MEDICAID', 'MassHealth', 'MASSHEALTH', 'MH789012', 'MEDICAID',
  'ACTIVE', 'IN_NETWORK',
  'REFERRAL_SENT', 'HIGH', 0.55, '{"telehealth": 0.15, "medicaid": 0.20, "urgency": 0.10, "days_since_creation": 0.10}',
  NOW() + INTERVAL '2 days',
  '{"sms": true, "email": true, "voice": false}',
  NOW() - INTERVAL '5 days'
);

-- =============================================================================
-- SCENARIO 9: Self-Pay, Cost Barrier
-- Anna Kowalski, uninsured, CRITICAL risk
-- Expected: CRITICAL risk - needs financial counseling
-- =============================================================================
INSERT INTO referrals (
  id, patient_id, doctor_id,
  specialist_type, diagnosis_codes, clinical_summary, urgency_level, referral_category,
  visit_type, city, state,
  insurance_type,
  patient_responsibility_estimate,
  status, risk_level, risk_score, risk_factors,
  follow_up_due_at,
  patient_consent_preferences,
  created_at
) VALUES (
  'a0000009-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000003',
  '11111111-1111-1111-1111-111111111111',
  'Endocrinology', ARRAY['E11.9', 'E78.5'], 'Type 2 diabetes with hyperlipidemia. Needs endocrine evaluation for medication optimization.',
  'ROUTINE', 'SPECIALIST',
  'IN_PERSON', 'Arlington', 'MA',
  'SELF_PAY',
  850.00,
  'PATIENT_ACTION_NEEDED', 'CRITICAL', 0.75, '{"self_pay": 0.30, "high_cost": 0.25, "days_since_creation": 0.20}',
  NOW() + INTERVAL '1 day',
  '{"sms": false, "email": false, "voice": false}',
  NOW() - INTERVAL '7 days'
);

-- Create manual outreach task for Scenario 9 (no consent for automated messages)
INSERT INTO staff_scheduling_tasks (
  id, referral_id, task_type, priority, status, instructions, required_actions
) VALUES (
  'b0000009-0000-0000-0000-000000000009',
  'a0000009-0000-0000-0000-000000000009',
  'MANUAL_PATIENT_OUTREACH', 'CRITICAL', 'PENDING',
  'Patient has not consented to automated messages. Self-pay patient with high cost barrier ($850). Call patient to discuss financial assistance options and scheduling.',
  ARRAY['Call patient directly', 'Discuss sliding scale / payment plan options', 'Explore charity care eligibility', 'Offer community health center alternatives', 'Document conversation']
);

-- =============================================================================
-- SCENARIO 10: Expired Coverage
-- Michael O'Brien, Cigna coverage ended, CRITICAL risk
-- Expected: CRITICAL risk - insurance expired, needs re-verification
-- =============================================================================
INSERT INTO referrals (
  id, patient_id, doctor_id,
  specialist_type, diagnosis_codes, clinical_summary, urgency_level, referral_category,
  visit_type, city, state,
  insurances,
  insurance_type, payer_name, payer_id, member_id, group_number, plan_type,
  coverage_end_date,
  eligibility_status, eligibility_checked_at, eligibility_response,
  status, risk_level, risk_score, risk_factors,
  follow_up_due_at,
  patient_consent_preferences,
  created_at
) VALUES (
  'a0000010-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000004',
  '11111111-1111-1111-1111-111111111111',
  'Pulmonology', ARRAY['J45.40', 'J44.9'], 'Moderate persistent asthma with COPD overlap. Pulmonary function testing needed.',
  'ROUTINE', 'SPECIALIST',
  'IN_PERSON', 'Lexington', 'MA',
  '[{"payer_name": "Cigna", "payer_id": "CIGNA", "member_id": "CIG999888777", "group_number": "EXPIRED01", "plan_type": "PPO", "priority": "PRIMARY", "coverage_end_date": "2024-12-31"}]',
  'COMMERCIAL', 'Cigna', 'CIGNA', 'CIG999888777', 'EXPIRED01', 'PPO',
  '2024-12-31',
  'INACTIVE', NOW() - INTERVAL '2 hours', '{"status": "INACTIVE", "termination_date": "2024-12-31", "reason": "COVERAGE_TERMINATED"}',
  'ELIGIBILITY_FAILED', 'CRITICAL', 0.80, '{"expired_coverage": 0.35, "eligibility_failed": 0.25, "days_since_creation": 0.20}',
  NOW() + INTERVAL '1 day',
  '{"sms": true, "email": true, "voice": true}',
  NOW() - INTERVAL '6 days'
);

-- Create staff task for Scenario 10
INSERT INTO staff_scheduling_tasks (
  id, referral_id, task_type, priority, status, instructions, required_actions
) VALUES (
  'b0000010-0000-0000-0000-000000000010',
  'a0000010-0000-0000-0000-000000000010',
  'MANUAL_ELIGIBILITY_CHECK', 'CRITICAL', 'PENDING',
  'Insurance coverage expired (Cigna terminated 12/31/2024). Contact patient to verify current insurance status or explore alternatives.',
  ARRAY['Call patient to verify current coverage', 'Check for new employer coverage', 'Explore ACA Marketplace options', 'Assess self-pay capability', 'Update referral with new insurance info']
);

-- =============================================================================
-- SAMPLE SPECIALIST CACHE DATA
-- Pre-populated specialist data for recommendations
-- =============================================================================
INSERT INTO specialist_cache (
  npi, first_name, last_name, specialty, taxonomy_code, taxonomy_description,
  address_line1, city, state, postal_code, phone,
  latitude, longitude,
  mips_quality_score, patient_experience_score,
  annual_service_volume, total_beneficiaries,
  estimated_wait_days, rank_score,
  data_sources
) VALUES
  ('1111111111', 'James', 'Wilson', 'Cardiology', '207RC0000X', 'Cardiovascular Disease',
   '100 Medical Center Dr', 'Boston', 'MA', '02115', '617-555-0101',
   42.3601, -71.0589, 92.5, 88.0, 2500, 1800, 7, 85.5, ARRAY['NPPES', 'PHYSICIAN_COMPARE']),
  ('2222222222', 'Emily', 'Chen', 'Cardiology', '207RC0000X', 'Cardiovascular Disease',
   '200 Heart Health Way', 'Cambridge', 'MA', '02139', '617-555-0102',
   42.3736, -71.1097, 88.0, 91.0, 2100, 1500, 10, 82.3, ARRAY['NPPES', 'PHYSICIAN_COMPARE']),
  ('3333333333', 'Robert', 'Kumar', 'Orthopedics', '207X00000X', 'Orthopedic Surgery',
   '300 Bone & Joint Ctr', 'Brookline', 'MA', '02445', '617-555-0103',
   42.3318, -71.1212, 90.0, 85.5, 1800, 1200, 14, 78.9, ARRAY['NPPES']),
  ('4444444444', 'Sarah', 'Patel', 'Gastroenterology', '207RG0100X', 'Gastroenterology',
   '400 Digestive Health', 'Newton', 'MA', '02458', '617-555-0104',
   42.3370, -71.2092, 94.0, 89.0, 2200, 1600, 12, 81.2, ARRAY['NPPES', 'PHYSICIAN_COMPARE']),
  ('5555555555', 'Michael', 'O''Connor', 'Pulmonology', '207RP1001X', 'Pulmonary Disease',
   '500 Breathing Center', 'Somerville', 'MA', '02143', '617-555-0105',
   42.3876, -71.0995, 86.5, 87.0, 1600, 1100, 8, 79.8, ARRAY['NPPES']),
  ('6666666666', 'Lisa', 'Nakamura', 'Psychiatry', '2084P0800X', 'Psychiatry',
   '600 Mental Wellness', 'Waltham', 'MA', '02451', '617-555-0106',
   42.3765, -71.2356, 91.0, 93.0, 1400, 900, 21, 76.5, ARRAY['NPPES', 'PHYSICIAN_COMPARE']),
  ('7777777777', 'David', 'Okafor', 'Nephrology', '207RN0300X', 'Nephrology',
   '700 Kidney Care Ctr', 'Medford', 'MA', '02155', '617-555-0107',
   42.4184, -71.1062, 89.0, 86.0, 1200, 800, 16, 74.2, ARRAY['NPPES']),
  ('8888888888', 'Jennifer', 'Park', 'Endocrinology', '207RE0101X', 'Endocrinology, Diabetes & Metabolism',
   '800 Hormone Health', 'Arlington', 'MA', '02474', '617-555-0108',
   42.4154, -71.1565, 93.5, 90.0, 1900, 1300, 18, 77.8, ARRAY['NPPES', 'PHYSICIAN_COMPARE']),
  ('9999999999', 'Thomas', 'Mueller', 'Dermatology', '207N00000X', 'Dermatology',
   '900 Skin Care Clinic', 'Quincy', 'MA', '02169', '617-555-0109',
   42.2529, -71.0023, 87.5, 88.5, 2800, 2200, 5, 84.1, ARRAY['NPPES']),
  ('0000000001', 'Maria', 'Rodriguez', 'Radiology', '2085R0202X', 'Diagnostic Radiology',
   '1000 Imaging Center', 'Lexington', 'MA', '02420', '617-555-0110',
   42.4473, -71.2245, 95.0, 84.0, 3500, 2800, 3, 88.7, ARRAY['NPPES', 'PHYSICIAN_COMPARE'])
ON CONFLICT (npi) DO UPDATE SET
  mips_quality_score = EXCLUDED.mips_quality_score,
  rank_score = EXCLUDED.rank_score,
  last_refreshed_at = NOW();

-- =============================================================================
-- SAMPLE CHAT MESSAGES
-- Pre-populated messages for testing real-time chat
-- =============================================================================
INSERT INTO chat_messages (referral_id, sender_id, sender_role, message_text, message_type, created_at) VALUES
  -- Scenario 1: Happy path with some chat
  ('a0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'doctor',
   'Hi Jane, I''ve submitted your referral to cardiology. You should receive information about available specialists shortly.', 'TEXT', NOW() - INTERVAL '23 hours'),
  ('a0000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'patient',
   'Thank you, Dr. Mitchell! I''ll look out for that. How soon should I schedule?', 'TEXT', NOW() - INTERVAL '22 hours'),
  ('a0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'doctor',
   'I''d recommend scheduling within the next 2 weeks. Let me know if you need any help with that.', 'TEXT', NOW() - INTERVAL '21 hours'),

  -- Scenario 7: Urgent hospice communication
  ('a0000007-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'doctor',
   'Elizabeth''s family, I''ve submitted the urgent hospice referral. Our intake team will be reaching out within the next few hours.', 'TEXT', NOW() - INTERVAL '30 minutes'),

  -- Scenario 8: Telehealth scheduling
  ('a0000008-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'doctor',
   'Hi Carlos, your psychiatry referral has been approved. Since this is a telehealth visit, you''ll receive a video link before your appointment.', 'TEXT', NOW() - INTERVAL '4 days')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- REFERRAL METRICS EVENTS
-- Sample events for analytics
-- =============================================================================
INSERT INTO referral_metrics (referral_id, event_type, event_data, actor_id, actor_role, created_at) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'CREATED', '{"specialist_type": "Cardiology"}', '11111111-1111-1111-1111-111111111111', 'doctor', NOW() - INTERVAL '1 day'),
  ('a0000001-0000-0000-0000-000000000001', 'ELIGIBILITY_CHECKED', '{"status": "ACTIVE", "network": "IN_NETWORK"}', NULL, 'system', NOW() - INTERVAL '23 hours'),
  ('a0000001-0000-0000-0000-000000000001', 'STATUS_CHANGED', '{"from": "CREATED", "to": "ELIGIBILITY_CONFIRMED"}', NULL, 'system', NOW() - INTERVAL '23 hours'),
  ('a0000001-0000-0000-0000-000000000001', 'MESSAGE_SENT', '{"message_type": "TEXT"}', '11111111-1111-1111-1111-111111111111', 'doctor', NOW() - INTERVAL '23 hours'),

  ('a0000007-0000-0000-0000-000000000007', 'CREATED', '{"specialist_type": "Hospice Care", "urgency": "STAT"}', '11111111-1111-1111-1111-111111111111', 'doctor', NOW()),
  ('a0000007-0000-0000-0000-000000000007', 'FAST_TRACK_TRIGGERED', '{"reason": "STAT_HOSPICE", "sla_hours": 24}', NULL, 'system', NOW()),
  ('a0000007-0000-0000-0000-000000000007', 'RISK_ESCALATED', '{"from": "HIGH", "to": "CRITICAL", "reason": "hospice_stat"}', NULL, 'system', NOW())
ON CONFLICT DO NOTHING;

-- =============================================================================
-- VERIFICATION QUERIES
-- Run these to verify seed data was inserted correctly
-- =============================================================================

-- Verify counts
-- SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
-- UNION ALL SELECT 'referrals', COUNT(*) FROM referrals
-- UNION ALL SELECT 'staff_scheduling_tasks', COUNT(*) FROM staff_scheduling_tasks
-- UNION ALL SELECT 'specialist_cache', COUNT(*) FROM specialist_cache
-- UNION ALL SELECT 'chat_messages', COUNT(*) FROM chat_messages
-- UNION ALL SELECT 'referral_metrics', COUNT(*) FROM referral_metrics;

-- Verify risk levels
-- SELECT risk_level, COUNT(*) FROM referrals GROUP BY risk_level ORDER BY risk_level;

-- Verify task priorities
-- SELECT priority, COUNT(*) FROM staff_scheduling_tasks GROUP BY priority ORDER BY priority;
