# QA Audit Playbook

## Outputs
Each audit run produces:
- `QA_AUDIT_REPORT.json`
- `QA_AUDIT_REPORT.md`

## Pass/Fail
- FAIL if any CRITICAL findings exist.
- FAIL if any HIGH findings exist.
- WARN-only findings do not fail the build but must be reviewed and either fixed or waived.

## What is scanned
1. Full repo text scan (code + config + docs).
2. Dependency scripts scan:
   - preinstall / postinstall / prepare / install
3. Dangerous code patterns:
   - process execution and dynamic code evaluation
4. External domain discovery:
   - Extracts hosts from URLs and flags unknown hosts (WARN by default).

## Phase gates
- Phase 0 (Sanitization baseline): zero vendor lock-in remnants (as defined in `tools/qa_blocklist.json`).
- Phase 1 (Backend foundation): `/health` present, DB init called; no forbidden fallback endpoints.
- Phase 4 (Frontend on Vercel): build output matches `dist/public`; same-origin `/api/*` preserved via rewrites.
