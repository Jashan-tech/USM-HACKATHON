-- =============================================================================
-- REFREE - Referral + Intake Automation MVP
-- Row Level Security (RLS) Policies
-- =============================================================================

-- =============================================================================
-- PROFILES TABLE RLS
-- =============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile during signup
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Staff can view all profiles (for referral context)
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;
CREATE POLICY "Staff can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Doctors can view patient profiles for their referrals
DROP POLICY IF EXISTS "Doctors can view patient profiles" ON profiles;
CREATE POLICY "Doctors can view patient profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM referrals
      WHERE referrals.patient_id = profiles.id
        AND referrals.doctor_id = auth.uid()
    )
  );

-- =============================================================================
-- DOCTOR INVITE CODES TABLE RLS
-- =============================================================================
ALTER TABLE doctor_invite_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can check if a code exists (for validation)
DROP POLICY IF EXISTS "Anyone can read invite codes" ON doctor_invite_codes;
CREATE POLICY "Anyone can read invite codes"
  ON doctor_invite_codes FOR SELECT
  USING (true);

-- Only authenticated users can use codes
DROP POLICY IF EXISTS "Authenticated users can use codes" ON doctor_invite_codes;
CREATE POLICY "Authenticated users can use codes"
  ON doctor_invite_codes FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- REFERRALS TABLE RLS
-- =============================================================================
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Doctors can view their own referrals
DROP POLICY IF EXISTS "Doctors can view their referrals" ON referrals;
CREATE POLICY "Doctors can view their referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = doctor_id);

-- Patients can view their own referrals
DROP POLICY IF EXISTS "Patients can view their referrals" ON referrals;
CREATE POLICY "Patients can view their referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = patient_id);

-- Staff can view all referrals
DROP POLICY IF EXISTS "Staff can view all referrals" ON referrals;
CREATE POLICY "Staff can view all referrals"
  ON referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Doctors can create referrals
DROP POLICY IF EXISTS "Doctors can create referrals" ON referrals;
CREATE POLICY "Doctors can create referrals"
  ON referrals FOR INSERT
  WITH CHECK (
    auth.uid() = doctor_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'doctor'
    )
  );

-- Doctors can update their referrals
DROP POLICY IF EXISTS "Doctors can update their referrals" ON referrals;
CREATE POLICY "Doctors can update their referrals"
  ON referrals FOR UPDATE
  USING (auth.uid() = doctor_id);

-- Patients can update certain fields on their referrals
DROP POLICY IF EXISTS "Patients can update their referrals" ON referrals;
CREATE POLICY "Patients can update their referrals"
  ON referrals FOR UPDATE
  USING (auth.uid() = patient_id);

-- Staff can update all referrals
DROP POLICY IF EXISTS "Staff can update referrals" ON referrals;
CREATE POLICY "Staff can update referrals"
  ON referrals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- =============================================================================
-- CHAT MESSAGES TABLE RLS
-- =============================================================================
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Doctors can view messages for their referrals
DROP POLICY IF EXISTS "Doctors can view messages for their referrals" ON chat_messages;
CREATE POLICY "Doctors can view messages for their referrals"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM referrals
      WHERE referrals.id = chat_messages.referral_id
        AND referrals.doctor_id = auth.uid()
    )
  );

-- Patients can view messages for their referrals
DROP POLICY IF EXISTS "Patients can view messages for their referrals" ON chat_messages;
CREATE POLICY "Patients can view messages for their referrals"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM referrals
      WHERE referrals.id = chat_messages.referral_id
        AND referrals.patient_id = auth.uid()
    )
  );

-- Doctors can send messages for their referrals
DROP POLICY IF EXISTS "Doctors can send messages" ON chat_messages;
CREATE POLICY "Doctors can send messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM referrals
      WHERE referrals.id = chat_messages.referral_id
        AND referrals.doctor_id = auth.uid()
    )
  );

-- Patients can send messages for their referrals
DROP POLICY IF EXISTS "Patients can send messages" ON chat_messages;
CREATE POLICY "Patients can send messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM referrals
      WHERE referrals.id = chat_messages.referral_id
        AND referrals.patient_id = auth.uid()
    )
  );

-- Users can update read status on messages they can view
DROP POLICY IF EXISTS "Users can mark messages as read" ON chat_messages;
CREATE POLICY "Users can mark messages as read"
  ON chat_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM referrals
      WHERE referrals.id = chat_messages.referral_id
        AND (referrals.doctor_id = auth.uid() OR referrals.patient_id = auth.uid())
    )
  );

-- =============================================================================
-- MESSAGE TEMPLATES TABLE RLS
-- =============================================================================
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view templates
DROP POLICY IF EXISTS "Anyone can view templates" ON message_templates;
CREATE POLICY "Anyone can view templates"
  ON message_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- STAFF SCHEDULING TASKS TABLE RLS
-- =============================================================================
ALTER TABLE staff_scheduling_tasks ENABLE ROW LEVEL SECURITY;

-- Staff can view all tasks
DROP POLICY IF EXISTS "Staff can view all tasks" ON staff_scheduling_tasks;
CREATE POLICY "Staff can view all tasks"
  ON staff_scheduling_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Staff can create tasks
DROP POLICY IF EXISTS "Staff can create tasks" ON staff_scheduling_tasks;
CREATE POLICY "Staff can create tasks"
  ON staff_scheduling_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Staff can update tasks
DROP POLICY IF EXISTS "Staff can update tasks" ON staff_scheduling_tasks;
CREATE POLICY "Staff can update tasks"
  ON staff_scheduling_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Doctors can view tasks for their referrals
DROP POLICY IF EXISTS "Doctors can view tasks for their referrals" ON staff_scheduling_tasks;
CREATE POLICY "Doctors can view tasks for their referrals"
  ON staff_scheduling_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM referrals
      WHERE referrals.id = staff_scheduling_tasks.referral_id
        AND referrals.doctor_id = auth.uid()
    )
  );

-- Doctors can create tasks for their referrals
DROP POLICY IF EXISTS "Doctors can create tasks for their referrals" ON staff_scheduling_tasks;
CREATE POLICY "Doctors can create tasks for their referrals"
  ON staff_scheduling_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM referrals
      WHERE referrals.id = staff_scheduling_tasks.referral_id
        AND referrals.doctor_id = auth.uid()
    )
  );

-- Patients can create tasks for their referrals (request help)
DROP POLICY IF EXISTS "Patients can request help" ON staff_scheduling_tasks;
CREATE POLICY "Patients can request help"
  ON staff_scheduling_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM referrals
      WHERE referrals.id = staff_scheduling_tasks.referral_id
        AND referrals.patient_id = auth.uid()
    )
  );

-- =============================================================================
-- SPECIALIST CACHE TABLE RLS
-- =============================================================================
ALTER TABLE specialist_cache ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view specialists
DROP POLICY IF EXISTS "Anyone can view specialists" ON specialist_cache;
CREATE POLICY "Anyone can view specialists"
  ON specialist_cache FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- BOOKINGS TABLE RLS
-- =============================================================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users can view bookings for their referrals
DROP POLICY IF EXISTS "Users can view their bookings" ON bookings;
CREATE POLICY "Users can view their bookings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM referrals
      WHERE referrals.id = bookings.referral_id
        AND (referrals.doctor_id = auth.uid() OR referrals.patient_id = auth.uid())
    )
  );

-- Staff can view all bookings
DROP POLICY IF EXISTS "Staff can view all bookings" ON bookings;
CREATE POLICY "Staff can view all bookings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- Patients can create bookings for their referrals
DROP POLICY IF EXISTS "Patients can create bookings" ON bookings;
CREATE POLICY "Patients can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM referrals
      WHERE referrals.id = bookings.referral_id
        AND referrals.patient_id = auth.uid()
    )
  );

-- Staff can create bookings
DROP POLICY IF EXISTS "Staff can create bookings" ON bookings;
CREATE POLICY "Staff can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- =============================================================================
-- REFERRAL METRICS TABLE RLS
-- =============================================================================
ALTER TABLE referral_metrics ENABLE ROW LEVEL SECURITY;

-- Users can view metrics for their referrals
DROP POLICY IF EXISTS "Users can view their referral metrics" ON referral_metrics;
CREATE POLICY "Users can view their referral metrics"
  ON referral_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM referrals
      WHERE referrals.id = referral_metrics.referral_id
        AND (referrals.doctor_id = auth.uid() OR referrals.patient_id = auth.uid())
    )
  );

-- Staff can view all metrics
DROP POLICY IF EXISTS "Staff can view all metrics" ON referral_metrics;
CREATE POLICY "Staff can view all metrics"
  ON referral_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- System can insert metrics (via service role)
DROP POLICY IF EXISTS "System can insert metrics" ON referral_metrics;
CREATE POLICY "System can insert metrics"
  ON referral_metrics FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- AUDIT LOG TABLE RLS
-- =============================================================================
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only staff can view audit logs
DROP POLICY IF EXISTS "Staff can view audit logs" ON audit_log;
CREATE POLICY "Staff can view audit logs"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'staff'
    )
  );

-- System can insert audit logs (via service role)
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_log;
CREATE POLICY "System can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (true);
