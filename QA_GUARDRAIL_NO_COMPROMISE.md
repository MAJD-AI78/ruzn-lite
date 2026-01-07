# QA Guardrail and No-Compromise Policy

## Purpose
This policy defines non-negotiable constraints for the Ruzn migration and establishes automated audit gates to prevent any lingering Manus dependencies, backdoors, or unsafe changes.

## Non-negotiables
1. Remove all Manus dependencies and endpoints from **all** repo files (code, config, docs, examples). Zero tolerance.
2. Keep production risk low:
   - Phase 1 must avoid client refactors that change API call topology.
   - Prefer same-origin API behavior using edge rewrites/proxy.
3. No secrets in the repository (including examples that look like real keys).
4. Every phase must produce an automated QA audit report and must pass before proceeding.
5. Every change must be logged in `MIGRATION_CHANGELOG.md` with rollback steps.

## Hard-fail (CRITICAL) vendor remnants
The CRITICAL blocklist is maintained in `tools/qa_blocklist.json` and is enforced across the entire repository (no exceptions).

## Risk patterns (HIGH unless explicitly justified)
Dangerous dynamic execution and OS command execution must not appear in runtime code paths (and must be justified even in tooling).

## External domain policy
- Unknown external domains are WARN (non-blocking) by default.
- If an unknown domain appears in runtime code paths, promote to HIGH and fix or explicitly waive.

## Allowed domains allowlist (starting point)
See `tools/qa_allowlist.json`. New domains must be:
- justified in `MIGRATION_CHANGELOG.md`
- added to the allowlist
- re-audited
