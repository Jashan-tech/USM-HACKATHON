# Refree - Referral + Intake Automation MVP

A closed-loop referral completion engine for healthcare practices. Refree actively drives referrals to completion with risk-based follow-ups, intelligent scheduling, and real-time tracking.

## Problem Statement

Referral and intake workflows leak because the process is manual and fragmented. Staff spend 20-30 minutes per patient manually reviewing insurance cards and clinical documents, then re-entering data across multiple systems.

**This causes:**
- 40-60% referral leakage (never complete)
- Delays in scheduling and care delivery
- High staff workload and burnout
- Poor visibility into what's blocking completion

## Key Features

- **Risk-Based Follow-ups**: Automatic follow-up timing based on referral risk level (CRITICAL: 1 day, HIGH: 2 days, MEDIUM: 5 days, LOW: 10 days)
- **Specialist Matching**: Find the best specialists using NPI + CMS data with transparent quality rankings
- **Real-Time Messaging**: In-context chat between doctors and patients tied to each referral
- **Insurance Verification**: Automated eligibility checks with OCR extraction and prior auth tracking
- **Scheduling Concierge**: AI-assisted availability matching and staff-assisted booking
- **Consent Compliance**: HIPAA-compliant consent tracking with automatic fallback to manual outreach

## Measurable Outcomes (Targets)

1. **Time from referral created → appointment booked**: < 7 days
2. **Referral leakage rate**: < 20%
3. **Staff touches per referral**: < 3

## Tech Stack

- **Framework**: Next.js 14+ (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (Postgres + Auth + Realtime)
- **Queue**: Redis + BullMQ
- **Validation**: Zod
- **OCR**: Tesseract.js
- **AI**: OpenAI (server-side only)

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Supabase account (free tier works)
- OpenAI API key (optional, for AI features)

### 1. Clone and Install

```bash
git clone <repository-url>
cd refree
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the following scripts in order:
   - `sql/schema.sql` - Creates all tables
   - `sql/rls.sql` - Sets up Row Level Security policies
   - `sql/seed.sql` - Populates test data (10 synthetic scenarios)
3. Go to **Authentication > URL Configuration** and set:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Supabase (from Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (for Docker: redis://redis:6379)
REDIS_URL=redis://localhost:6379

# OpenAI (optional)
OPENAI_API_KEY=your-openai-key

# Enable dev routes for email verification bypass
ENABLE_DEV_ROUTES=true
```

### 4. Start Services

**Option A: With Docker (Recommended)**

```bash
docker-compose up
```

This starts:
- Next.js app on port 3000
- Redis on port 6379
- BullMQ worker for background jobs

**Option B: Without Docker**

```bash
# Terminal 1: Start Redis (install redis first)
redis-server

# Terminal 2: Start Next.js
npm run dev

# Terminal 3: Start worker
npm run worker:dev
```

### 5. Access the App

Open [http://localhost:3000](http://localhost:3000)

## Test Accounts

The seed data includes test users. Create accounts using these credentials:

**Doctor:**
- Email: `doctor@test.com`
- Invite Code: `DEMO2026`

**Patient:**
- Email: Any email (no invite code needed)

**Staff:**
- Email: Any email (no invite code needed)

### Email Verification (Local Development)

Since Supabase email verification is disabled in development, use the dev utility:

```
GET /api/dev/verify-email?email=your-email@example.com
```

## Project Structure

```
refree/
├── docker-compose.yml          # Docker services config
├── .env.example                # Environment template
├── sql/
│   ├── schema.sql              # Database schema
│   ├── rls.sql                 # Row Level Security
│   └── seed.sql                # Test data (10 scenarios)
├── src/
│   ├── app/
│   │   ├── (auth)/             # Auth pages (login, signup)
│   │   ├── (doctor)/           # Doctor dashboard & pages
│   │   ├── (patient)/          # Patient portal
│   │   ├── (staff)/            # Staff queue
│   │   └── api/                # API routes
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layout/             # Sidebar, ThemeProvider
│   │   ├── referrals/          # ReferralCard, forms
│   │   └── chat/               # Chat interface
│   ├── services/
│   │   ├── risk_scoring_service.ts
│   │   ├── insurance_verification_service.ts
│   │   ├── scheduling_agent_service.ts
│   │   ├── specialist_service.ts
│   │   ├── chat_service.ts
│   │   ├── consent_service.ts
│   │   └── document_extraction_service.ts
│   ├── lib/
│   │   ├── supabase.ts         # Supabase clients
│   │   ├── redis.ts            # Redis + rate limiting
│   │   ├── queue.ts            # BullMQ config
│   │   ├── utils.ts            # Helpers
│   │   └── validations.ts      # Zod schemas
│   ├── types/                  # TypeScript types
│   └── workers/
│       └── queue-worker.ts     # BullMQ job processor
└── README.md
```

## Synthetic Test Scenarios

The seed data includes 10 referrals covering key workflows:

| # | Patient | Scenario | Risk | Expected Outcome |
|---|---------|----------|------|------------------|
| 1 | Jane Doe | Clean happy path | LOW | Success |
| 2 | John Smith | Unreadable insurance card | MEDIUM | Needs Review |
| 3 | Maria Garcia | Conflicting DOB | HIGH | Conflict Resolution |
| 4 | Robert Johnson | Dual coverage (Medicare + Medicaid) | MEDIUM | CoB Handling |
| 5 | Sarah Lee | Out-of-network specialist | HIGH | Find Alternative |
| 6 | David Kim | Prior auth required, MRI | HIGH | Staff Task |
| 7 | Elizabeth Brown | Hospice STAT (fast-track) | CRITICAL | 24hr SLA |
| 8 | Carlos Martinez | Telehealth + Medicaid | HIGH | Standard Flow |
| 9 | Anna Kowalski | Self-pay, no consent | CRITICAL | Manual Outreach |
| 10 | Michael O'Brien | Expired coverage | CRITICAL | Re-verification |

## Acceptance Checklist

- [ ] `docker-compose up` runs without errors
- [ ] Patient signup works
- [ ] Doctor signup requires valid invite code (DEMO2026)
- [ ] Role-based routing works (doctor → /dashboard, patient → /home)
- [ ] Referral creation form works
- [ ] Dashboard shows risk distribution
- [ ] Referral list has filter/search
- [ ] Risk badges show correct colors (green/amber/red/dark-red)
- [ ] Status pills show correct states
- [ ] Real-time chat delivers messages
- [ ] Specialist search returns results
- [ ] Fast-track logic triggers for STAT + HOSPICE

## API Endpoints

### Referrals
- `GET /api/referrals` - List referrals
- `POST /api/referrals` - Create referral
- `GET /api/referrals/[id]` - Get referral details
- `PATCH /api/referrals/[id]` - Update referral

### Chat
- `GET /api/chat/[referralId]` - Get messages
- `POST /api/chat/[referralId]` - Send message

### Specialists
- `GET /api/specialists?specialty=Cardiology&state=MA` - Search specialists

### Bookings
- `POST /api/bookings` - Create booking

### Dev (Local Only)
- `GET /api/dev/verify-email?email=...` - Bypass email verification

## Risk Scoring Formula

```javascript
risk_score = sum of applicable factors (capped at 1.0)

Factors:
- Telehealth: +0.15
- Medicaid: +0.20, Medicare: +0.10, Self-Pay: +0.25
- Prior auth pending: +0.20
- Days without booking: +0.10 (2d) to +0.35 (14d+)
- Eligibility issues: +0.15
- High patient responsibility (>$500): +0.10
- STAT urgency: +0.15
- STAT + HOSPICE: +0.50

Risk Levels:
- 0.70+: CRITICAL (1-day follow-up)
- 0.50-0.69: HIGH (2-day follow-up)
- 0.30-0.49: MEDIUM (5-day follow-up)
- 0.00-0.29: LOW (10-day follow-up)
```

## Roadmap Beyond MVP

### Phase 2: Real Payer Integration
- Availity/Change Healthcare for live 270/271 EDI
- CoverMyMeds for prior auth
- Webhook listeners for async status updates

### Phase 3: EHR Integration
- FHIR R4 API (Epic, Cerner, Athena)
- Bi-directional referral sync
- SSO via SMART on FHIR

### Phase 4: Advanced AI
- Predictive leakage model
- NLP clinical justification for prior auth
- Voice-based availability (Twilio)

### Phase 5: Compliance Hardening
- HIPAA audit logging
- Encryption at rest
- SOC 2 Type II
- Penetration testing

## Troubleshooting

**"Redis connection refused"**
- Ensure Redis is running: `redis-cli ping`
- For Docker: check `docker-compose ps`

**"Email verification required"**
- Use the dev route: `/api/dev/verify-email?email=your-email`
- Or disable email confirmation in Supabase dashboard

**"Invite code invalid"**
- Use one of the seeded codes: DEMO2026, PILOT001, BETA123

**"RLS policy violation"**
- Ensure RLS policies are applied: run `sql/rls.sql`
- Check that user profile exists with correct role

## License

MIT

---

Built for healthcare practices that want to close the loop on patient referrals.
