# AGENTS.md — Codex Operating Rules (ruzn-lite)

Codex tasks in this repo must prioritize:
- Security by default (no client-side auth as security)
- No secrets committed
- Deterministic behavior (no silent fallbacks)
- Minimal, reviewable diffs
- Always open PRs from a feature branch

## Global Constraints
1) Never commit .env or any secrets.
2) Never add hardcoded API keys.
3) PUBLIC_MODE=true must contain zero client identifiers.
4) SOVEREIGN_MODE=true must never call external APIs for embeddings.
5) Never route to LLM providers that are not implemented+enabled.

## Standard Commands (use these; do not invent new ones)
### Install
- pnpm install --frozen-lockfile

### Quality Gates (run before pushing)
- pnpm security:audit
- pnpm -s lint
- pnpm -s test
- pnpm -s build

If lint/test/build are not configured, report it and run:
- pnpm -s typecheck (if exists)

## Task Playbooks

### A) Run security audit + open PR
1) Create branch:
   - git checkout -b chore/security-audit-<short-desc>

2) Run gates:
   - pnpm security:audit
   - pnpm -s lint || true
   - pnpm -s test || true
   - pnpm -s build || true

3) If failures occur:
   - Fix the issue
   - Re-run pnpm security:audit (must pass)

4) Commit:
   - git add -A
   - git commit -m "Security: pass audit + harden routes"

5) Push:
   - git push -u origin HEAD

6) Open PR:
   Prefer GitHub CLI:
   - gh pr create --base main --title "Security audit fixes" --body "Automated audit + hardening. See checklist in PR." || true

If gh is unavailable, output the branch name so the user can open PR manually.

### B) Refactor router safely
Goal: convert sensitive endpoints to protectedProcedure + RBAC.
Steps:
1) Create branch:
   - git checkout -b refactor/router-auth-<short-desc>

2) Search and replace:
   - ripgrep "publicProcedure" -n server || true
   - Ensure all sensitive procedures are protectedProcedure.

3) Validate:
   - pnpm security:audit
   - pnpm -s test || true

4) Commit and PR as above.

### C) Ingest knowledge (pgvector)
Prereqs:
- KNOWLEDGE_PGVECTOR_URL set (env var)
- Postgres w/ pgvector reachable from container (or skip actual ingest and only validate scripts)

Commands:
- pnpm knowledge:pgvector:migrate
- pnpm knowledge:pgvector:ingest

If embeddings backend is local and LOCAL_EMBEDDINGS_URL is not reachable, do NOT switch to OpenAI automatically in sovereign mode. Instead:
- Report the missing local embedding service
- Provide a stub strategy (precomputed DB snapshot) or request enabling a local embedder.

### D) Move local changes to GitHub reliably
Codex should never directly modify main.
Always:
- create a branch
- add commits
- push branch
- create PR
