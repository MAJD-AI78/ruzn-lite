# AGENTS.md — Codex Operating Rules (ruzn-lite) v2

This repo supports both public and restricted deployments. Codex (or any automated agent) must follow these rules to prevent security regressions, secret leaks, and sovereign-mode violations.

---

## Definitions
**Codex / Agent**: Any automated assistant that edits code, runs commands, commits, pushes, or creates PRs.

**PUBLIC_MODE=true**
- Public-facing build.
- Must contain **zero client identifiers**, sensitive narratives, or restricted content.
- No references to specific government entities, real emails, or client names.

**GOV_DEMO_MODE=true**
- Restricted build for approved demos.
- Client identifiers may exist only if approved and controlled.

**SOVEREIGN_MODE=true**
- No external calls for embeddings, retrieval, analytics, web search, or telemetry.
- Requires **local embeddings** (`EMBEDDINGS_BACKEND=local`) and local retrieval backend.

**protectedProcedure vs publicProcedure**
- `publicProcedure`: accessible without authentication (unsafe for sensitive functions).
- `protectedProcedure`: requires authentication; may additionally require RBAC.

---

## Hard Rules (non-negotiable)
1) Never commit `.env`, tokens, or credentials.
2) Never introduce client-side checks as “security.” AuthZ must be server-side.
3) In PUBLIC_MODE=true, client identifiers must not exist anywhere in the repo content used by the build.
4) In SOVEREIGN_MODE=true:
   - `EMBEDDINGS_BACKEND` MUST be `local`
   - Retrieval backend MUST be local-capable (`pgvector|qdrant|sqlite_vec`)
5) Never route to LLM providers that are not **implemented AND enabled**.
6) No silent fallbacks that fabricate data. If data is missing, fail clearly with correlation ID.

---

## Required Commands (do not invent alternatives)
### Install
- `pnpm install --frozen-lockfile`

### Quality Gates (must run before pushing)
- `pnpm security:audit`
- `pnpm preflight` (must pass)
- `pnpm -s lint`
- `pnpm -s test`
- `pnpm -s build`

If a script does not exist:
- Add it, or update tooling so it exists.
- Do not “|| true” your way into a green PR.

---

## Enforcement
This repo includes preflight enforcement:
- `pnpm preflight` MUST fail if:
  - sensitive routes use `publicProcedure`
  - PUBLIC_MODE has client identifiers
  - SOVEREIGN_MODE uses external embeddings
  - configured providers are not implemented
  - required scripts are missing

---

## Task Playbooks

### A) Run security audit + open PR
1) Create branch:
   - `git checkout -b chore/security-audit-<short-desc>`
2) Run gates:
   - `pnpm security:audit`
   - `pnpm preflight`
   - `pnpm -s lint`
   - `pnpm -s test`
   - `pnpm -s build`
3) Commit:
   - `git add -A`
   - `git commit -m "Security: pass audit + enforce guardrails"`
4) Push:
   - `git push -u origin HEAD`
5) PR:
   - `gh pr create --base main --title "Security guardrails" --body "Audit + preflight + mode enforcement." || true`

### B) Refactor router safely (auth + RBAC)
1) Branch:
   - `git checkout -b refactor/router-auth-<short-desc>`
2) Replace:
   - Sensitive `publicProcedure` → `protectedProcedure`
3) Ensure RBAC:
   - server-side checks
4) Gates:
   - `pnpm security:audit && pnpm preflight && pnpm -s test`
5) Commit + PR

### C) Knowledge ingest (pgvector)
Prereqs:
- `KNOWLEDGE_PGVECTOR_URL` set and reachable
- In sovereign mode: local embeddings service is running

Commands:
- `pnpm knowledge:pgvector:migrate`
- `pnpm knowledge:pgvector:ingest`

If embeddings are misconfigured in sovereign mode:
- fail with clear error; do NOT switch to OpenAI automatically.

### D) Move changes to GitHub reliably
Never push to main directly. Always:
- feature branch
- commit
- push
- PR
- pass preflight + audits
