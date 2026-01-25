# Referral + Intake Automation MVP — Claude Research Prompt

## ROLE
You are (1) a skeptical healthcare ops leader, (2) a senior systems architect, and (3) a compliance-minded product manager.

Your job: find flaws/contradictions/hidden complexity, then repair the design into a coherent, testable MVP plan.

---

## IMPORTANT CONSTRAINTS (READ FIRST)

- Assume this is an MVP for a clinic/hospice intake team with **limited engineering bandwidth**
- Do NOT assume access to real payer portals or EHR production systems
- For the demo, use **ONLY synthetic data** (no real PHI). Explicitly state this.
- "Automation" must be defined as: **auto-extract + validate + prepare submissions + track status + route to humans for approvals**
- No medical advice. No legal advice. Provide operational/compliance controls and options.

---

## CONTEXT (PROBLEM)

Specialist referrals and patient intake are slow and fragmented. Staff manually re-enter data from insurance cards, referral orders, labs, and notes across systems (~20–30 min/patient), causing delays and errors. In hospice, time-sensitive acceptance decisions + insurance/referral checks must happen fast or patients are lost to competitors. We want a closed-loop workflow that ingests documents, extracts/validates key details, supports eligibility and prior-auth checks, prepares referral packets, updates internal systems, and drives completion with visibility.

---

## DEFINITIONS (USE THESE)

- **Eligibility check** = coverage active on date of service, plan type, benefits relevant to requested service, network status, patient responsibility (if available), and any hospice-specific coverage flags if applicable.
- **Prior authorization check** = whether auth is required for the requested service and (if submitted) status; requires correct codes + provider identifiers + clinical justification attachments.
- **"Referral sent"** = packet assembled + transmitted via available channel (API/EDI/fax/email upload/manual) + evidence of transmission recorded.
- **"Closed-loop"** = referral outcome recorded: scheduled, declined, unable to contact, missing info, insurance not eligible, or redirected.

---

## YOUR TASK — TWO PHASES

### PHASE 1: BREAK IT (BE RUTHLESS)

Identify flaws and missing requirements in ALL categories below. For every critique, propose a concrete fix.

#### 1) Scope ambiguity & hidden complexity
- Define where the workflow starts and ends.
- Identify steps that must remain human-approved and why.

#### 2) Data & document reality
- List critical fields often missing/unreadable per doc type (insurance card, referral order, labs, clinical notes, demographics).
- Handling conflicting info across documents (rules + evidence).

#### 3) Eligibility checks
- What data sources are required: EDI 270/271, clearinghouse APIs, payer APIs, or manual verification.
- What can be checked automatically in MVP vs deferred.

#### 4) Prior authorization checks
- What exactly is checked in MVP (auth required + status tracking) vs out of scope (full clinical criteria automation).
- Required codes/identifiers: ICD-10, CPT/HCPCS, NPI, taxonomy, place of service, ordering/referring provider.
- Common real failures and their detection signals.

#### 5) Workflow ownership & accountability
- Explicit RACI (Responsible/Accountable/Consulted/Informed) per step.
- How to avoid "AI did it" blame: auditability, sign-offs, evidence display.

#### 6) Integration constraints
- List target systems: EHR, CRM/referral tracker, fax, document store, patient messaging.
- Best-case APIs vs worst-case manual steps with evidence capture (no unsafe assumptions).

#### 7) Compliance, consent, and safety
- HIPAA minimum necessary, BAAs, audit logs, access control, retention, PHI handling boundaries.
- Patient contact consent (SMS/phone/email), DNC, and state variability (flag as configurable).

#### 8) Operational edge cases
- Dual coverage/coordination of benefits, Medicare/Medicaid, expired coverage, out-of-network.
- Hospice-specific acceptance constraints (eligibility paperwork, physician certification, time sensitivity).

#### 9) Metrics & proof
- What metrics can be gamed in a demo but fail in production.
- Define measurable outcomes that truly represent success.

#### 10) Failure modes & human-in-the-loop
- Provide TOP 10 failure modes with:
  - Severity (P0/P1/P2)
  - Detection method
  - Fallback action
  - Owner (role)
  - User-facing message

**PHASE 1 OUTPUT FORMAT:**
- A) Prioritized critical risks (P0/P1/P2) — bullet list
- B) "What would make this fail in the real world" — 8–12 bullets
- C) Unsafe assumptions — list + why unsafe + safer alternative

---

### PHASE 2: FIX IT (MAKE IT BUILDABLE)

Propose a corrected MVP plan that is coherent, testable, and realistic.

**PHASE 2 OUTPUTS (USE THESE HEADERS):**

#### A) Tightened problem statement (2–4 sentences)

#### B) MVP scope
- In scope (bullets)
- Out of scope (bullets)
- MVP exit criteria (5 measurable pass/fail checks)

#### C) Reference workflow as STATES
Represent as a state machine:
```
Documents Received → Extracted → Needs Review / Verified → Eligibility Checked → Prior Auth Required? → Prior Auth Submitted/Tracked → Referral Sent → Scheduled / Closed (Declined/Incomplete) → Intake Complete
```
Include allowed transitions + who can move states.

#### D) Data model (minimum required fields)
Provide a minimal schema including:
- Patient demographics
- Insurance info (payer, member ID, group, plan type)
- Referral details (ordering provider, specialist, diagnosis, requested service)
- Codes (ICD-10, CPT/HCPCS)
- Attachments (labs/notes) with provenance
- Confidence scoring per field
- Conflict resolution rules (e.g., "most recent signed order overrides card")
- "Evidence links" per extracted value

#### E) Integration plan
- Best case (APIs/EDI): list components + how data flows + retries
- Worst case (no APIs): human-assisted tasks + evidence capture (screenshots/confirmations) + audit trail
- Explicitly call out what is a "mock" for demo vs real integration later

#### F) Human-in-the-loop design
- Which actions require approval (and why)
- UI requirements:
  - Extracted fields + confidence + source doc snippet
  - Conflicts highlighted with recommended resolution
  - "Submit eligibility" and "submit prior auth" buttons gated by checklists
  - Task queue + SLA timers
  - Full audit trail view

#### G) Compliance controls
- Audit log event types (create/update/submit/override/export)
- RBAC roles (intake coordinator, nurse, billing, admin)
- PHI boundaries (what data may be sent to models; what stays in DB)
- Retention & deletion policy (configurable)
- Security basics (encryption at rest/in transit, secrets management)

#### H) Metrics tables (at least 5)
Define each with:
- Name
- Definition/formula
- Data source
- Target/threshold

Must include:
1. referral created → booked time
2. leakage rate after X days
3. staff touches per referral
4. eligibility turnaround time
5. prior auth turnaround time

#### I) Demo plan with seeded synthetic data
Provide 5–10 synthetic referrals with varied cases:
- clean case
- unreadable insurance card
- conflicting DOB across docs
- dual coverage
- out-of-network specialist
- auth required with missing CPT
- hospice urgent acceptance case

For each, define expected outcome: "Success" vs "Needs Review" and why.

Show a walkthrough narrative: 6–10 steps of the demo.

---

## DATASET INTEGRATION CONTEXT

### CMS Datasets to Merge with NPPES

**Primary:** NPPES (NPI Registry)
- Provides: NPI, provider name, taxonomy, addresses, phone

**Supplement 1:** CMS Physician Compare National Downloadable File
- URL: [data.cms.gov/provider-data/dataset/mj5m-pzi6](https://data.cms.gov/provider-data/dataset/mj5m-pzi6)
- Adds: Hospital affiliations, group practices, quality scores (MIPS), specialty certifications

**Supplement 2:** Medicare Provider Utilization and Payment Data
- URL: [data.cms.gov/provider-summary-by-type-of-service](https://data.cms.gov/provider-summary-by-type-of-service)
- Adds: Service volume by CPT, patient counts, payment amounts (proxy for wait times)

**Supplement 3:** CMS Care Compare (Hospital Quality)
- URL: [data.cms.gov/provider-data/topics/hospitals](https://data.cms.gov/provider-data/topics/hospitals)
- Adds: Hospital ratings, readmission rates, safety indicators

**Merge Strategy:**
- Join on NPI as primary key
- Cache merged data in `specialist_cache` table
- Refresh monthly (CMS updates quarterly)
- Use for specialist ranking: quality + volume + distance + estimated wait time

---

## INSURANCE TRACKING REQUIREMENTS

### Eligibility Verification Workflow
1. Extract insurance data from card (OCR)
2. Validate required fields (payer ID, member ID, group, plan type)
3. Trigger automated eligibility check (270/271 EDI or payer API)
4. Parse response: coverage status, network status, patient responsibility
5. Flag issues: expired coverage, out-of-network, high cost-sharing
6. Route to staff if check fails or returns ambiguous results

### Prior Authorization Workflow
1. Check payer rules engine: is auth required for service + diagnosis?
2. If yes, create staff task with required documents checklist
3. Staff submits auth request via payer portal (manual in MVP)
4. Track auth status: pending → approved/denied
5. If denied, flag reason and create appeal task
6. If approved, store auth number and expiration date

### Insurance Data Model
Required fields in `referrals` table:
- `insurance_type` (COMMERCIAL, MEDICARE, MEDICAID, etc.)
- `payer_name`, `payer_id` (for EDI)
- `member_id`, `group_number`, `plan_type`
- `coverage_start_date`, `coverage_end_date`
- `eligibility_status`, `eligibility_checked_at`, `eligibility_response` (JSONB)
- `network_status`, `patient_responsibility_estimate`
- `prior_auth_required`, `prior_auth_status`, `prior_auth_number`, `prior_auth_expiration_date`

---

## MIND MAP PROBLEM SOLUTIONS

### Problem: Manual Processes
**Solution:** Automated document extraction (OCR), auto-triggered eligibility checks, AI scheduling agent

### Problem: Delays & Missed Appointments
**Solution:** Risk-based follow-up timing (high-risk = 1-2 days), automated escalation, staff auto-booking

### Problem: High Staff Workload
**Solution:** Intelligent task routing (only flag low-confidence extractions), auto-booking, template responses

### Problem: Poor Visibility
**Solution:** Real-time status tracking, audit trail, dashboard metrics (time-to-book, leakage rate, staff touches)

---

## STYLE REQUIREMENTS

- Be specific, operational, and testable. No fluff.
- Use bullets, short sections, and clear ownership.
- When you critique, include a concrete fix.
- Label assumptions explicitly as "ASSUMPTION: …"
- If something depends on payer/EHR variability, mark it as configurable and provide a default.

---

## BEGIN NOW.
