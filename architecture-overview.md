# Refree - Referral + Intake Automation Platform

## Overview
Refree is a healthcare referral and intake automation platform built with Next.js 14, Supabase (PostgreSQL), and Redis. The system automates the traditionally manual referral process by implementing risk-based follow-ups, insurance verification, specialist matching, and scheduling assistance.

## Technology Stack
- **Framework**: Next.js 14+ (App Router) + TypeScript
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **Styling**: Tailwind CSS + shadcn/ui
- **Queue**: Redis + BullMQ
- **Validation**: Zod
- **OCR**: Tesseract.js
- **AI**: OpenAI (server-side only)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REFREE APPLICATION                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   NEXT.JS APP   │    │   API ROUTES    │    │   SUPABASE DB   │        │
│  │                 │    │                 │    │                 │        │
│  │ • Landing Page  │    │ • /api/referral │    │ • profiles      │        │
│  │ • Dashboards    │    │ • /api/chat     │    │ • referrals     │        │
│  │ • Forms         │    │ • /api/specialist│   │ • chat_messages │        │
│  │ • UI Components │    │ • /api/bookings │    │ • specialist_cache│      │
│  │                 │    │ • /api/staff-tasks│   │ • bookings      │        │
│  └─────────────────┘    │ • /api/eligibility│   │ • staff_scheduling_tasks││
│                         │ • /api/upload   │    │ • referral_metrics│      │
│                         └─────────────────┘    │ • audit_log     │        │
│                                                └─────────────────┘        │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   SERVICES      │    │   BACKGROUND    │    │   EXTERNAL      │        │
│  │                 │    │   JOBS (BullMQ) │    │   SYSTEMS       │        │
│  │ • risk_scoring  │    │                 │    │                 │        │
│  │ • insurance_ver │    │ • Eligibility   │    │ • NPPES API     │        │
│  │ • scheduling_ag │    │ • Prior Auth    │    │ • CMS Quality   │        │
│  │ • specialist_se │    │ • Staff Schedul │    │ • Payer APIs    │        │
│  │ • chat_service  │    │ • Follow-ups    │    │ • OCR/Tesseract │        │
│  │ • consent_serv  │    │ • Risk Calc     │    │ • OpenAI        │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   UTILITIES     │    │   CONFIG        │    │   REDIS         │        │
│  │                 │    │                 │    │                 │        │
│  │ • validations   │    │ • env vars      │    │ • Rate limiting │        │
│  │ • utils         │    │ • middleware    │    │ • Job queues    │        │
│  │ • types         │    │ • auth          │    │ • Cache         │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Data Model

### Key Tables
- **profiles**: User profiles with role-based access (doctor/patient/staff)
- **referrals**: Core referral tracking with risk scoring and status management
- **chat_messages**: Real-time messaging between participants
- **staff_scheduling_tasks**: Tasks for staff intervention
- **specialist_cache**: Cached specialist data from external sources
- **bookings**: Scheduled appointments
- **referral_metrics**: Event tracking for analytics
- **audit_log**: Comprehensive audit trail for compliance

## Main Workflows

### 1. Create Referral (Doctor Action)
1. Doctor navigates to referral creation form
2. POST `/api/referrals` validates input via Zod schema
3. Inserts referral record and calculates risk score
4. For STAT+HOSPICE, creates urgent intake task
5. Logs creation event to metrics table

### 2. Process Eligibility Check (Background Job)
1. BullMQ job processes eligibility-check queue
2. Calls payer API via insurance_verification_service
3. Updates referral with eligibility results
4. Creates staff task if prior auth required
5. Logs eligibility event to metrics

### 3. Patient Follow-up (Automated)
1. Scheduled job in follow-up queue based on risk level
2. Verifies patient consent via consent_service
3. Creates follow-up message based on template
4. Updates referral follow-up tracking fields
5. Logs follow-up event to metrics

## Configuration & Runtime

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anonymous key for client-side operations
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- `REDIS_URL` - Redis connection string
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `ENABLE_DEV_ROUTES` - Enable development utility routes

### Deployment Options
1. **Docker (Recommended)**: `docker-compose up`
2. **Manual**: Start Redis, Next.js app, and worker separately

## Integrations

### External Systems
- **Supabase**: Database and authentication with Row Level Security
- **Redis**: Rate limiting and BullMQ job queues
- **NPPES API**: Specialist lookup and verification
- **CMS Quality Data**: Provider quality scores
- **Payer APIs**: Insurance verification and prior authorization
- **OCR/Tesseract.js**: Document processing
- **OpenAI API**: AI-assisted features (optional)

## Key Features

### Risk-Based Follow-ups
- CRITICAL: 1-day follow-up
- HIGH: 2-day follow-up  
- MEDIUM: 5-day follow-up
- LOW: 10-day follow-up

### Specialist Matching
- Find best specialists using NPI + CMS data
- Quality rankings and transparent scoring

### Insurance Verification
- Automated eligibility checks
- OCR extraction from insurance cards
- Prior authorization tracking

### Scheduling Concierge
- AI-assisted availability matching
- Staff-assisted booking for complex cases

## HIPAA Compliance Measures
- Row Level Security for data access control
- Audit logging for all operations
- Encrypted data transmission
- Role-based access controls

## Development Notes
- **Test Accounts**: doctor@test.com (invite code: DEMO2026)
- **Synthetic Scenarios**: 10 test referrals covering key workflows
- **Local Email Verification**: GET `/api/dev/verify-email?email=...`