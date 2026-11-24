## 2026-11-24 18:12 (UTC) — fix(ui): lock Sidebar log-out control during async sign out

**Changes:**
- `src/components/layout/Sidebar.tsx`: Added `loggingOut` disabled guard and `"Logging out…"` label on the sidebar dropdown Log out item.
- Verification: `tsc --noEmit` shows 0 errors in `Sidebar.tsx` (1 pre-existing error remains in untouched `__tests__/services/risk_scoring_service.test.ts`).

## 2026-07-03 01:24 (UTC) — Local secret containment cleanup

**Changes:**
- Replaced tracked raw credential values in examples, templates, docs, or helper scripts with placeholders.
- Preserved local runtime secret files for active development.
- Verified transcript JSONL redaction remains valid and exact local secret scans return zero tracked hits.

