# Referral + Intake Automation MVP — Complete Build Prompt

## ROLE
You are a senior full-stack engineer and product-minded systems designer. Build a production-quality MVP that is end-to-end functional and locally reproducible. Make explicit, safe assumptions when needed and document them. Do not omit requirements.

---

## CONTEXT AND PROBLEM (RUBRIC CRITICAL)

**Problem to solve:** Referral and intake workflows leak because the process is manual and fragmented. Staff spend 20–30 minutes per patient manually reviewing insurance cards and clinical documents, then re-entering data across multiple systems. This causes:
- 40–60% referral leakage (never complete)
- Delays in scheduling and care delivery
- High staff workload and burnout
- Poor visibility into what's blocking completion
- In time-sensitive settings (hospice, specialist referrals), these delays lead to lost patients and missed revenue

**Evidence requirements for the project:**

Define 3 measurable failure modes to track in the system:
1. **Time from referral created → appointment booked** (target: <7 days)
2. **Referral leakage rate** (no appointment booked after 14 days) (target: <20%)
3. **Staff touches per referral** (proxy metric via staff tasks + messages) (target: <3)

Include a short "why existing solutions are insufficient" section:
- Traditional referral workflows rely on fax/EHR handoffs, fragmented patient portals, and manual calling
- Existing tools often provide messaging OR scheduling OR referral records, but not a closed-loop completion workflow tied to risk and follow-up timing
- No automated risk scoring or intelligent escalation

**Target users and realistic setting:**
- **Primary:** Specialist practices (referral coordinators, schedulers, insurance/prior auth staff, practice managers)
- **Secondary:** Hospice/home health intake teams (intake coordinators, clinical reviewers, ops managers)

**TAM-style framing (conservative assumptions):**
- 200,000 specialist practices in US
- Average 50 referrals/month per practice
- $50/month SaaS subscription or $5/referral usage-based pricing
- TAM: $120M ARR (subscription model) or $600M/year (usage-based)
- **Who pays:** Clinic subscription (per-provider or per-location pricing)

---

## PRODUCT IDEA / DIFFERENTIATOR (INNOVATION)

Build a "closed-loop referral completion engine" with:
- **Risk-based follow-up timing** (high-risk = 1-2 days, low-risk = 10 days)
- **Patient scheduling concierge flow** (AI-assisted availability matching)
- **Staff scheduling queue** when patients request help (auto-booking)
- **Real-time in-thread communication** tied to each referral (Supabase Realtime)
- **Specialist recommendations** via NPI + CMS datasets with transparent ranking
- **Insurance verification workflow** with automated eligibility checks and prior auth tracking
- **Document extraction** with OCR, confidence scoring, and conflict detection

**Differentiator vs generic portals:** The system actively drives referrals to completion and measures leakage/time-to-book, rather than only storing records.

---

## PROJECT GOAL

Build a full-stack Next.js application with three role-based UIs:
1. **Doctor UI:** Create referrals, view dashboard, manage staff tasks, chat with patients
2. **Patient UI:** View referrals, book appointments, chat with doctor, provide availability
3. **Staff UI:** Process manual review tasks, submit prior auth, handle scheduling requests

Enable referrals, tracking, follow-ups, scheduling completion, insurance verification, and real-time chat.

---

## UI / DESIGN (NONNEGOTIABLE)

- **Layout:** Notion-like left sidebar + Linear-like card grid for lists
- **Aesthetic:** Modern healthcare portal with premium feel
- **Color modes:** Light mode + dark mode with toggle
- **Corners:** Heavy rounded corners across the UI (16px+)
- **Primary colors:** Blue (#3b82f6) and white, with risk badges (green/amber/red)
- **Status pills:** Subtle, color-coded by status
- **Shadows:** Soft shadows for depth
- **Framework:** Tailwind CSS + shadcn/ui components
- **Accessibility:** Readable contrast (WCAG AA), focus states, keyboard navigation

**Must not look monotone:**
- Risk badges: green (LOW), amber (MEDIUM), red (HIGH), dark red (CRITICAL)
- Status pills with distinct colors per state
- Tinted section headers
- Gradient accents for CTAs

### PHASE 1/2 CRITICAL UI REQUIREMENTS

**Split-Screen Validation (P0 - Prevents Transcription Errors):**
- For any task with status `NEEDS_REVIEW`, the UI **MUST** display:
  - **Left panel:** Source document image (insurance card, referral order, etc.) with zoom controls
  - **Right panel:** Data entry form with extracted values pre-filled
  - **Highlight mode:** Click a field in the form to highlight the corresponding area in the source document
  - **Confidence indicators:** Show confidence score next to each field (green >0.85, yellow 0.70-0.85, red <0.70)
  - **Conflict warnings:** Display conflicts in red with "Existing value" vs "Extracted value" comparison

**Manual Override Mode (P0 - Automation Fallback):**
- For **Eligibility Check** and **Prior Auth** workflows:
  - Provide a "Manual Entry" toggle at the top of the form
  - When toggled ON, show additional fields:
    - "Verification Method" (dropdown: Phone, Payer Portal, Fax, Other)
    - "Reference Number" (text input)
    - "Agent Name" (text input, if phone verification)
    - "Verification Notes" (textarea)
  - All manual entries must be timestamped and attributed to the staff member
  - Display "Manually Verified" badge on referral card when manual override used

---

## TECH STACK DEFAULTS

- **Framework:** Next.js 14+ App Router + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Validation:** Zod schemas for all inputs
- **Caching/Queue:** Redis (ioredis) + BullMQ for job processing
- **Rate limiting:** Redis sliding window per IP and per user_id
- **Database:** Supabase (Auth + Realtime + Postgres)
- **External APIs:** NPI Registry, OpenAI (server-side only)
- **OCR:** Tesseract.js or cloud OCR service
- **Icons:** lucide-react

---

## AUTH + ACCESS CONTROL

**Authentication:** Supabase Auth with email/password
- Email verification required
- **Local dev workaround:** Provide a development-only utility route (`/api/dev/verify-email`) that confirms user email via Supabase Admin API, guarded by `NODE_ENV=development`

**Signup flow:**
- Role selection required: `doctor`, `patient`, or `staff`
- Doctor signup requires invite code validated server-side
- Store roles/profiles in `profiles` table

**Authorization:**
- Supabase RLS policies enforce row-level access
- Server-side authorization checks in all API routes/actions
- Never expose Supabase service role key to client

**Roles:**
- `doctor`: Create referrals, view their referrals, chat with patients, manage staff tasks
- `patient`: View their referrals, book appointments, chat with doctor
- `staff`: Process manual review tasks, submit prior auth, handle scheduling requests

---

## LOCAL DEVELOPMENT (FEASIBILITY)

**Docker Compose setup:**
- Next.js app (port 3000)
- Redis (port 6379) for rate limiting + BullMQ queues
- **No local Postgres:** All tables live in Supabase Postgres (RLS + Realtime work correctly)

**Supabase setup checklist:**
1. Create Supabase project at supabase.com
2. Run provided SQL schema scripts in Supabase SQL Editor
3. Run seed data scripts
4. Set Auth redirect URLs: `http://localhost:3000/auth/callback`
5. Enable email confirmation (or use dev utility for local testing)
6. Copy project URL and anon key to `.env.local`

**README must include:**
- Exact setup commands (`docker-compose up`, `npm install`, `npm run dev`)
- Verification checklist (auth works, referral creation works, chat works, etc.)
- `.env.example` with all required variables

---

## DATA MODEL + RLS (REQUIRED)

### Tables to Create

#### 1. `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('doctor', 'patient', 'staff')),
  full_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  state VARCHAR(2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
```

#### 2. `doctor_invite_codes`
```sql
CREATE TABLE doctor_invite_codes (
  code TEXT PRIMARY KEY,
  used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed some codes
INSERT INTO doctor_invite_codes (code) VALUES ('DEMO2026'), ('PILOT001'), ('BETA123');
```

#### 3. `referrals` (ENHANCED WITH PHASE 1/2 RISK MITIGATIONS)
```sql
CREATE TABLE referrals (
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
  urgency_level TEXT DEFAULT 'ROUTINE', -- STAT, URGENT, ROUTINE
  referral_category TEXT, -- SPECIALIST, HOSPICE, HOME_HEALTH
  
  -- Visit context
  visit_type TEXT, -- TELEHEALTH, IN_PERSON
  telehealth_flag BOOLEAN DEFAULT FALSE,
  visit_date DATE,
  
  -- Location
  city TEXT,
  state VARCHAR(2),
  preferred_distance_miles INTEGER DEFAULT 25,
  
  -- PHASE 1/2 ENHANCEMENT: Multiple Insurances (Coordination of Benefits)
  insurances JSONB DEFAULT '[]', -- Array of { payer_name, payer_id, member_id, group_number, plan_type, priority: 'PRIMARY'|'SECONDARY', coverage_start_date, coverage_end_date }
  
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
  eligibility_status TEXT, -- ACTIVE, INACTIVE, UNKNOWN, ERROR
  eligibility_response JSONB, -- store full 271 response or API response
  network_status TEXT, -- IN_NETWORK, OUT_OF_NETWORK, UNKNOWN
  patient_responsibility_estimate DECIMAL(10, 2),
  
  -- Prior authorization tracking
  prior_auth_required BOOLEAN DEFAULT FALSE,
  prior_auth_submitted_at TIMESTAMPTZ,
  prior_auth_number VARCHAR(50),
  prior_auth_status TEXT, -- PENDING, APPROVED, DENIED, EXPIRED
  prior_auth_expiration_date DATE,
  prior_auth_denial_reason TEXT,
  
  -- Status & workflow
  status TEXT DEFAULT 'CREATED',
  risk_level TEXT DEFAULT 'MEDIUM',
  risk_score DECIMAL(5, 2), -- 0.00 to 1.00
  risk_factors JSONB, -- store breakdown of risk contributors
  
  -- Follow-up timing
  follow_up_due_at TIMESTAMPTZ,
  last_follow_up_sent_at TIMESTAMPTZ,
  follow_up_count INTEGER DEFAULT 0,
  
  -- PHASE 1/2 ENHANCEMENT: Explicit Consent Tracking (P0 Compliance Risk)
  patient_consent_preferences JSONB DEFAULT '{"sms": false, "email": false, "voice": false}',
  
  -- PHASE 1/2 ENHANCEMENT: Dynamic Checklist for Hospice/Specialty Forms
  required_documents_checklist JSONB, -- e.g. { "terminal_cert": false, "dnr": false, "physician_orders": false }
  
  -- Document tracking
  documents JSONB, -- array of {type, url, uploaded_at, confidence_scores}
  extraction_conflicts JSONB, -- flagged conflicts for review
  
  -- Scheduling
  preferred_availability JSONB, -- patient availability blocks
  selected_specialist_npi VARCHAR(10),
  
  -- PHASE 1/2 ENHANCEMENT: Accountability Audit
  last_verified_by UUID REFERENCES auth.users(id),
  last_verified_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_updated_by UUID REFERENCES auth.users(id)
);

-- RLS Policies
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view their referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Patients can view their referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Staff can view all referrals"
  ON referrals FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'staff'));

CREATE POLICY "Doctors can create referrals"
  ON referrals FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors and staff can update referrals"
  ON referrals FOR UPDATE
  USING (auth.uid() = doctor_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'staff'));

-- Indexes
CREATE INDEX idx_referrals_patient ON referrals(patient_id);
CREATE INDEX idx_referrals_doctor ON referrals(doctor_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_risk ON referrals(risk_level, risk_score DESC);
CREATE INDEX idx_referrals_follow_up ON referrals(follow_up_due_at) WHERE follow_up_due_at IS NOT NULL;
CREATE INDEX idx_referrals_category ON referrals(referral_category, urgency_level);
CREATE INDEX idx_referrals_urgency ON referrals(urgency_level) WHERE urgency_level = 'STAT';
```

**Key enhancements:**
- **Multi-insurance support:** `insurances` JSONB array for coordination of benefits
- **Consent tracking:** `patient_consent_preferences` for HIPAA compliance
- **Dynamic checklists:** `required_documents_checklist` for hospice/specialty workflows
- **Accountability:** `last_verified_by` and `last_verified_at` for audit trails

#### 4. `chat_messages`
See implementation plan Component 7 for full schema with:
- Referral association
- Sender info (sender_id, sender_role)
- Message content (message_text, message_type, template_id)
- Read tracking (is_read, read_at)
- Attachments and context data

**RLS:** Only doctor and patient for the referral can read/write messages.

#### 5. `message_templates`
Pre-built templates for common messages (follow-up, scheduling, insurance, etc.)

#### 6. `staff_scheduling_tasks`
```sql
CREATE TABLE staff_scheduling_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL, -- MANUAL_SCHEDULING, MANUAL_ELIGIBILITY_CHECK, SUBMIT_PRIOR_AUTH
  priority TEXT DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  status TEXT DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  instructions TEXT,
  required_fields JSONB,
  required_documents JSONB,
  assigned_to UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE staff_scheduling_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view all tasks" ON staff_scheduling_tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'staff')
);
CREATE POLICY "Doctors can view tasks for their referrals" ON staff_scheduling_tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM referrals WHERE id = staff_scheduling_tasks.referral_id AND doctor_id = auth.uid())
);
```

#### 7. `specialist_cache`
See implementation plan Component 1 for full schema with merged NPPES + CMS data.

#### 8. `bookings`
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL UNIQUE REFERENCES referrals(id) ON DELETE CASCADE, -- UNIQUE ensures one booking per referral
  booked_slot_start_at TIMESTAMPTZ NOT NULL,
  booked_slot_end_at TIMESTAMPTZ NOT NULL,
  booked_by TEXT NOT NULL, -- PATIENT, STAFF
  specialist_npi VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view bookings for their referrals" ON bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM referrals WHERE id = bookings.referral_id AND (doctor_id = auth.uid() OR patient_id = auth.uid()))
);
```

#### 9. `referral_metrics`
```sql
CREATE TABLE referral_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- CREATED, FOLLOWUP_SENT, APPOINTMENT_BOOKED, STAFF_HELP_REQUESTED, MESSAGE_SENT
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referral_metrics_referral ON referral_metrics(referral_id, event_type);
```

---

## REFERRAL STATUS (REQUIRED)

**Strict status enum** (use everywhere):
```
CREATED
DOCUMENTS_RECEIVED
EXTRACTION_IN_PROGRESS
NEEDS_REVIEW
VERIFIED
ELIGIBILITY_CHECKING
ELIGIBILITY_CONFIRMED
ELIGIBILITY_FAILED
PRIOR_AUTH_REQUIRED
PRIOR_AUTH_SUBMITTED
PRIOR_AUTH_APPROVED
PRIOR_AUTH_DENIED
REFERRAL_SENT
PATIENT_ACTION_NEEDED
FOLLOW_UP_DUE
STAFF_SCHEDULING
APPOINTMENT_BOOKED
APPOINTMENT_COMPLETED
CLOSED_DECLINED
CLOSED_INCOMPLETE
CLOSED_REDIRECTED
```

**State machine:** See implementation plan Component 3 for full state diagram.

---

## DOCTOR UI REQUIREMENTS

**Sidebar navigation:**
- Dashboard
- Referrals
- Staff Scheduling Requests
- Messages
- Settings

**Create referral form sections:**
1. **Patient details** (read-only: name, email, phone + free-text "patient context note")
2. **Visit context** (visit type, visit date, telehealth flag)
3. **Referral details** (specialist type, diagnosis codes, service codes, clinical summary, urgency)
4. **Insurance** (upload card, or manually enter payer, member ID, group, plan type)

**Dashboard + Referrals view:**
- Linear-like card grid
- Each card shows: patient name, specialist type, status pill, risk badge, last updated
- Filters: status, risk level, follow-up due
- Sort: newest first, highest risk first, follow-up due soonest

**Referral detail page (3-panel layout):**
1. **Left panel:** Patient info, insurance status, eligibility results, prior auth status
2. **Center panel:** Status timeline (visual stepper), scheduling status, recommended actions
3. **Right panel:** Real-time chat with patient

**Staff Scheduling Requests queue:**
- List of tasks created by "Request staff help"
- Action: "Auto-book earliest slot" button
- On click: trigger BullMQ job to book earliest available slot
- Update status to APPOINTMENT_BOOKED
- Notify patient in-app + via chat

---

## PATIENT UI REQUIREMENTS

**Sidebar navigation:**
- Home
- Referrals
- Messages
- Settings

**Home view:**
- List of referrals with status + next action
- Prominent CTAs: "View Specialists", "Book Appointment", "Request Help"

**Referral detail page:**
1. **Status tracker** (visual progress bar with current status highlighted)
2. **Specialist recommendations grid** (3-6 cards with name, distance, quality score, wait time estimate)
3. **Follow-up form** (when follow_up_due_at is reached):
   - "Have your symptoms improved?" (yes/no)
   - "Have you scheduled an appointment?" (yes/no)
   - If improved=true AND scheduled=false → trigger OpenAI preventive message
4. **Real-time chat** with doctor
5. **Availability collection** (when scheduling):
   - Free-text input: "I'm free Tuesday and Thursday afternoons"
   - AI parses and matches with specialist office hours
   - Present 3-6 matching slots
   - Patient selects → create booking

---

## FOLLOW-UP + OPENAI PREVENTIVE MESSAGE

**Follow-up timing driven by risk engine:**
- CRITICAL: 1 day
- HIGH: 2 days
- MEDIUM: 5 days
- LOW: 10 days

**Follow-up form questions:**
1. "Have your symptoms improved?"
2. "Have you scheduled an appointment?"

**OpenAI message trigger:**
- If `symptoms_improved = true` AND `appointment_scheduled = false`
- Call OpenAI to generate short preventive follow-up message:
  - Use referral context (issue summary, specialist type, visit type)
  - Do NOT diagnose
  - Encourage completion, explain preventive reasons
  - End with: "Would you like help scheduling?"

**After AI message:**
- Show buttons: "Schedule for me" (self-service) and "Request staff help" (creates task)

### PHASE 1/2 CRITICAL: Strict Consent Guardrail (P0 Compliance)

**BEFORE triggering ANY automated communication (OpenAI message, SMS, email, voice call):**

```typescript
// Consent check logic (MUST be implemented)
async function canSendAutomatedMessage(referralId: string, channel: 'sms' | 'email' | 'voice'): Promise<boolean> {
  const referral = await getReferral(referralId);
  const consent = referral.patient_consent_preferences;
  
  // Check if patient has consented to this channel
  if (!consent || !consent[channel]) {
    // FALLBACK: Create manual call task for staff
    await createStaffTask({
      referral_id: referralId,
      task_type: 'MANUAL_PATIENT_OUTREACH',
      priority: 'HIGH',
      instructions: `Patient has not consented to automated ${channel} messages. Please call patient manually to follow up on referral.`,
      required_actions: ['Call patient', 'Document conversation', 'Update referral status']
    });
    
    return false;
  }
  
  return true;
}
```

**Implementation requirements:**
1. **Consent collection:** During patient signup and in Settings page, collect explicit consent for each channel
2. **Consent display:** Show consent status in referral detail page ("Patient consents: SMS ✓, Email ✓, Voice ✗")
3. **Audit logging:** Log every consent check with result (allowed/denied) and action taken
4. **Manual fallback:** If consent denied, ALWAYS create a "Manual Call Task" for staff with clear instructions

---

## SCHEDULING CONCIERGE SIMULATION (FEASIBLE MVP)

**Availability collection:**
- Patient enters availability in natural language via chat or form
- Parse using simple NLP or OpenAI function calling
- Store in `referrals.preferred_availability` as JSONB

**Slot matching:**
- Mock specialist office hours (Mon-Thu 9am-5pm, Fri 9am-3pm)
- Match patient availability with office hours
- Add specialist's `estimated_wait_days` to calculate earliest available date
- Generate 3-6 matching slots

**Booking:**
- Patient selects slot → create `bookings` row
- Set `referrals.status = 'APPOINTMENT_BOOKED'`
- **Idempotency:** UNIQUE constraint on `bookings.referral_id` prevents double-booking

**Staff help request:**
- Creates `staff_scheduling_tasks` row
- BullMQ job processes task:
  - Find earliest matching slot
  - Create booking (idempotent)
  - Update referral status
  - Notify patient via chat + in-app notification

---

## SPECIALIST RECOMMENDATIONS (NPI PROXY)

**Backend endpoint:** `/api/specialists/search`
- Query params: `specialty`, `city`, `state`, `limit`
- Proxy to NPI Registry API (version 2.1)
- **Never call NPI directly from browser**

**Data enrichment:**
- Join with `specialist_cache` table (merged NPPES + CMS data)
- Calculate distance estimate (Haversine formula from patient city/state)
- Estimate wait time from `annual_service_volume`
- Calculate `rank_score` using transparent formula (see implementation plan Component 1)

**Ranking formula:**
```javascript
rank_score = (
  0.35 * normalize(mips_quality_score, 0, 100) +
  0.25 * normalize(annual_service_volume, 0, max_volume) +
  0.25 * (1 - normalize(distance_miles, 0, 50)) +
  0.15 * (1 - normalize(estimated_wait_days, 0, 60))
) * 100
```

**Caching:**
- Cache in Redis with TTL 30 days
- Rate limit: 10 requests/minute per user

**UI display:**
- Show top 6 specialists ranked by score
- Display: name, specialty, distance, quality score, wait time estimate, rank score
- "Recommended" badge for top 3

---

## RISK SCORING (TRANSPARENT RULE-BASED)

**Risk factors (additive):**
1. Telehealth flag: +0.15
2. Insurance type penalty:
   - MEDICAID: +0.20
   - MEDICARE: +0.10
   - MEDICARE_ADVANTAGE: +0.12
   - SELF_PAY: +0.25
   - COMMERCIAL: +0.05
   - OTHER: +0.15
3. Prior auth pending: +0.20
4. Time since creation without booking:
   - 2+ days: +0.10
   - 5+ days: +0.15
   - 10+ days: +0.25
   - 14+ days: +0.35
5. Eligibility issues (inactive or out-of-network): +0.15
6. High patient responsibility (>$500): +0.10
7. Urgency (STAT): +0.15

**Risk level mapping:**
- 0.70+: CRITICAL
- 0.50-0.69: HIGH
- 0.30-0.49: MEDIUM
- 0.00-0.29: LOW

**Follow-up timing:**
- CRITICAL: 1 day
- HIGH: 2 days
- MEDIUM: 5 days
- LOW: 10 days

**Risk escalation:**
- If not booked after threshold, increase risk level and bring `follow_up_due_at` forward

**Recommended actions (generated from risk factors):**
- Prior auth pending → "Expedite prior authorization submission"
- Eligibility issues → "Resolve insurance eligibility issues"
- Days without booking > 10 → "Immediate patient outreach required"
- High cost sharing → "Discuss financial assistance options"
- CRITICAL level → "Escalate to care coordinator"

---

## MESSAGING (SUPABASE REALTIME)

**Schema:** See implementation plan Component 7

**Real-time implementation:**
- Subscribe using Supabase `postgres_changes` on INSERT for `chat_messages` filtered by `referral_id`
- Auto-scroll to bottom on new message
- Mark messages as read when viewed
- Show unread count badge in sidebar

**Message templates:**
- Pre-built templates for common scenarios (follow-up, scheduling, insurance)
- Template picker in chat UI
- Variable interpolation (e.g., `{{patient_name}}`, `{{specialist_type}}`)

**Notifications:**
- In-app notification when new message received
- Push notification (future: web push API)

---

## INSURANCE VERIFICATION WORKFLOW

**Document extraction (OCR):**
- Upload insurance card image
- Extract: payer name, member ID, group number, plan type
- Confidence scoring per field
- Auto-verify if confidence >0.85, else flag for manual review

**Conflict detection:**
- Compare extracted data with existing referral data
- Flag conflicts (e.g., different member ID)
- Resolution rule: most recent document wins (configurable)

**Eligibility check (MVP: simulated):**
- Validate required fields (payer_id, member_id, insurance_type)
- Simulate 270/271 EDI call (return mock response)
- Parse: coverage status, network status, patient responsibility
- Update referral with eligibility results

**Prior auth check (rule-based):**
- Check payer rules engine: is auth required for service + diagnosis?
- If yes:
  - Set `prior_auth_required = true`
  - Create staff task to submit auth
  - Increase risk level to HIGH
- Track auth status: PENDING → APPROVED/DENIED

**Fallback (manual verification):**
- If automated check fails, create staff task
- Staff verifies via payer portal
- Staff enters results manually
- Audit trail captures all actions

---

## SECURITY + RELIABILITY

**Rate limiting (Redis sliding window):**
- Global: 100 requests/minute per IP
- Per-user: 60 requests/minute
- NPI API: 10 requests/minute per user
- OpenAI: 5 requests/minute per user

**Validation (Zod):**
- All API inputs validated
- Clear error messages
- No raw database errors exposed to client

**PHI handling:**
- Mask PII in logs (never log raw PHI)
- Secrets only in env vars (never committed)
- Supabase service role key only on server

**Job queue (BullMQ):**
- Retry-safe and idempotent jobs
- Exponential backoff on failures
- Dead letter queue for failed jobs
- Job monitoring dashboard (optional)

---

## CMS DATASET INTEGRATION

**Primary:** NPPES (NPI Registry API)
- Real-time lookups for new providers

**Supplemental datasets (pre-merged in `specialist_cache`):**
1. **CMS Physician Compare** (quality scores, hospital affiliations)
2. **Medicare Provider Utilization** (service volume, patient counts)
3. **CMS Care Compare** (hospital quality ratings)

**Merge strategy:**
- Join on NPI as primary key
- Refresh monthly via background job
- TTL: 30 days

**Ranking uses:**
- Quality score (MIPS)
- Service volume (proxy for experience)
- Distance (Haversine from patient location)
- Estimated wait time (calculated from volume)

---

## DELIVERABLE OUTPUT FORMAT (IMPORTANT)

Return in this order:

### 1. Problem Framing Summary
- Failure modes (time-to-book, leakage rate, staff touches)
- Why existing tools insufficient
- Assumptions (clearly labeled)

### 2. Architecture Overview
- Tech stack diagram
- Data flow (referral creation → booking)
- Tradeoffs/bottlenecks:
  - Realtime scaling (Supabase limits)
  - Rate limits (NPI, OpenAI)
  - Caching TTL decisions
  - Job retry strategy

### 3. Repo Directory Structure
```
refree/
├── docker-compose.yml
├── .env.example
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── sql/
│   ├── schema.sql (all CREATE TABLE statements)
│   ├── rls.sql (all RLS policies)
│   └── seed.sql (synthetic data for 10 scenarios)
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (doctor)/
│   │   ├── (patient)/
│   │   ├── (staff)/
│   │   └── api/
│   ├── components/
│   │   ├── ChatInterface.tsx
│   │   ├── ReferralCard.tsx
│   │   ├── SpecialistRecommendations.tsx
│   │   └── ...
│   ├── services/
│   │   ├── risk_scoring_service.ts
│   │   ├── insurance_verification_service.ts
│   │   ├── scheduling_agent_service.ts
│   │   ├── chat_service.ts
│   │   └── ...
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── redis.ts
│   │   └── ...
│   └── types/
└── README.md
```

### 4. docker-compose.yml
Full working config for Next.js + Redis

### 5. .env.example
All required environment variables with descriptions

### 6. SQL Schema + RLS + Seed Data
- Complete schema for all tables
- All RLS policies
- Seed data for 10 synthetic scenarios (see below)

### 7. Key Next.js Files (Full Contents)
- API routes for referrals, specialists, chat, scheduling
- Page components for doctor/patient UIs
- Service implementations (risk scoring, insurance verification, etc.)
- React components (ChatInterface, ReferralCard, etc.)

### 8. README
Must include:
- **Setup commands** (exact steps to run locally)
- **Supabase setup checklist** (project creation, SQL scripts, Auth config)
- **Acceptance checklist** (verify each feature works)
- **Roadmap beyond hackathon** (real payer integration, EHR integration, HIPAA compliance)

---

## SYNTHETIC DATA SCENARIOS (REQUIRED)

Seed database with 10 referrals covering:

1. **Clean happy path** (Jane Doe, commercial insurance, cardiology, low risk)
2. **Unreadable insurance card** (John Smith, blurry image, needs manual review)
3. **Conflicting DOB** (Maria Garcia, card vs order mismatch)
4. **Dual coverage** (Robert Johnson, Medicare + Medicaid - PRIMARY/SECONDARY in `insurances` array)
5. **Out-of-network specialist** (Sarah Lee, Aetna HMO, specialist not in network)
6. **Prior auth required, missing CPT** (David Kim, UnitedHealthcare, MRI)
7. **Hospice urgent with fast-track** (Elizabeth Brown, age 82, STAT urgency, CRITICAL risk - **SEE ENHANCED REQUIREMENTS BELOW**)
8. **Telehealth + Medicaid** (Carlos Martinez, psychiatry, HIGH risk)
9. **Self-pay, cost barrier** (Anna Kowalski, uninsured, CRITICAL risk)
10. **Expired coverage** (Michael O'Brien, Cigna coverage ended, CRITICAL risk)

For each scenario, define:
- Patient profile
- Insurance details (use `insurances` JSONB array for Scenario 4)
- Referral details
- Expected flow (status transitions)
- Expected risk level
- Expected outcome ("Success" or "Needs Review" with reason)

### PHASE 1/2 ENHANCEMENT: Scenario 7 - Hospice Fast-Track Logic

**Patient:** Elizabeth Brown, Age 82, Terminal diagnosis (ICD-10: C34.90 - Malignant neoplasm of unspecified part of bronchus or lung)

**Referral details:**
- `referral_category`: "HOSPICE"
- `urgency_level`: "STAT"
- `required_documents_checklist`: `{"terminal_cert": false, "physician_orders": false, "dnr": false, "advance_directive": false}`
- Insurance: Medicare Hospice Benefit

**Fast-Track Logic (MUST DEMONSTRATE):**

```typescript
// Hospice fast-track detection
async function processReferralCreation(referralId: string) {
  const referral = await getReferral(referralId);
  
  // FAST-TRACK CONDITION: STAT + HOSPICE
  if (referral.urgency_level === 'STAT' && referral.referral_category === 'HOSPICE') {
    // BYPASS standard eligibility queues
    // IMMEDIATELY route to human "Intake Nurse" queue
    
    await createStaffTask({
      referral_id: referralId,
      task_type: 'HOSPICE_URGENT_INTAKE',
      priority: 'CRITICAL',
      assigned_to: null, // Auto-assign to first available intake nurse
      instructions: 'STAT HOSPICE REFERRAL - Terminal patient. Immediate intake required within 24 hours. Complete required documents checklist and expedite eligibility verification.',
      required_documents: ['terminal_cert', 'physician_orders', 'dnr', 'advance_directive'],
      sla_hours: 24 // Must be completed within 24 hours
    });
    
    // Set risk to CRITICAL
    await updateReferral(referralId, {
      risk_level: 'CRITICAL',
      risk_score: 0.95,
      risk_factors: {
        hospice_stat: 0.50,
        terminal_diagnosis: 0.30,
        time_sensitive: 0.15
      },
      follow_up_due_at: addHours(new Date(), 4) // Follow up in 4 hours
    });
    
    // Send immediate notification to intake team
    await sendUrgentNotification({
      team: 'INTAKE_NURSES',
      type: 'HOSPICE_STAT',
      message: 'STAT hospice referral for Elizabeth Brown (82F, terminal lung cancer). Immediate action required.',
      referral_id: referralId
    });
    
    // DO NOT wait for standard eligibility check queue
    // Intake nurse will handle eligibility verification manually
  }
}
```

**Expected flow:**
1. Referral created with STAT + HOSPICE flags
2. Fast-track logic triggers immediately (within seconds)
3. Task created in "Intake Nurse" queue with CRITICAL priority
4. Intake nurse receives urgent notification
5. Nurse manually verifies Medicare Hospice Benefit eligibility
6. Nurse completes required documents checklist
7. Status updates to REFERRAL_SENT within 24 hours
8. Patient contacted for admission scheduling

**Success criteria:**
- Task created within 5 seconds of referral creation
- Task priority = CRITICAL
- SLA timer shows "23:59:55" countdown
- Intake nurse queue shows task at top (sorted by priority)
- No automated eligibility check attempted (bypassed)
- Audit log shows "FAST_TRACK_HOSPICE" event

---

## ACCEPTANCE CRITERIA (MUST PASS)

- [ ] `docker-compose up` runs app + Redis locally
- [ ] Patient signup works with email verification (or dev utility)
- [ ] Doctor signup requires valid invite code
- [ ] Role-based routing prevents cross-access (RLS enforced)
- [ ] Referral creation form works, uploads insurance card
- [ ] Document extraction returns confidence scores
- [ ] Low confidence triggers NEEDS_REVIEW status
- [ ] Eligibility check updates referral status
- [ ] Prior auth check creates staff task when required
- [ ] Risk scoring calculates correctly for all 10 scenarios
- [ ] Follow-up timing matches risk level
- [ ] Real-time chat delivers messages within 2 seconds
- [ ] Chat messages only visible to doctor + patient for that referral
- [ ] Specialist recommendations display with ranking
- [ ] NPI proxy caches results and respects rate limits
- [ ] Patient can select availability and book appointment
- [ ] Booking is idempotent (no double-booking on retries)
- [ ] "Request staff help" creates task and triggers BullMQ job
- [ ] Staff queue auto-books earliest slot and notifies patient
- [ ] Dashboard metrics match `referral_metrics` table data
- [ ] All state transitions follow defined state machine
- [ ] Audit trail captures every status change with timestamp + user
- [ ] Code is modular, typed (TypeScript), follows Next.js best practices
- [ ] README includes complete setup checklist and verification steps

---

## ROADMAP BEYOND MVP

### Phase 2: Real Payer Integration
- Integrate Availity or Change Healthcare for live 270/271 EDI
- Add payer-specific prior auth portals (CoverMyMeds, Surescripts)
- Implement retry logic with exponential backoff
- Add webhook listeners for async auth status updates

### Phase 3: EHR Integration
- FHIR R4 API integration (Epic, Cerner, Athena)
- Bi-directional referral sync
- Automated clinical summary extraction from EHR notes
- Single sign-on (SSO) via SMART on FHIR

### Phase 4: Advanced AI Features
- Predictive leakage model (ML-based, trained on historical data)
- NLP-based clinical justification generation for prior auth
- Voice-based availability collection (Twilio + speech-to-text)
- Sentiment analysis on patient messages to detect frustration

### Phase 5: Compliance & Security Hardening
- HIPAA audit logging with tamper-proof storage
- Encryption at rest for all PHI fields
- BAA execution with all vendors
- SOC 2 Type II certification
- Penetration testing and vulnerability scanning

---

## STYLE REQUIREMENTS

- Be specific, operational, and testable. No fluff.
- Use TypeScript everywhere with strict types
- Follow Next.js App Router best practices
- Modular code: services, components, utilities
- Clear error handling with user-friendly messages
- Comprehensive comments for complex logic
- Test coverage for critical paths (risk scoring, eligibility, booking)

---

## BEGIN NOW.

Build the complete Referral + Intake Automation MVP following this specification exactly. Include all required files in the deliverable format specified above.
