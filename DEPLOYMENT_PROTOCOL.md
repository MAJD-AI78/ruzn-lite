# RUZN-LITE DEPLOYMENT PROTOCOL
## Mandatory Code Update & Deployment Standard Operating Procedure (SOP)

**Document Version:** 1.0  
**Effective Date:** December 29, 2025  
**Author:** Manus AI (on behalf of MAJD-AI78)  
**Classification:** MANDATORY - All deployments must comply

---

## 1. PURPOSE AND SCOPE

This protocol establishes **mandatory procedures** for all code updates, modifications, and deployments to the Ruzn-Lite platform. This document was created in response to critical incidents where unauthorized changes, ignored instructions, and lack of proper approval processes caused significant operational and legal risks.

**This protocol applies to:**
- All code changes (frontend, backend, database)
- Configuration updates
- Schema modifications
- Branding/content changes
- Third-party integrations
- Any modification to production systems

**Non-compliance with this protocol is strictly prohibited.**

---

## 2. INCIDENT BACKGROUND

The following incidents necessitated this protocol:

| Date | Incident | Impact | Root Cause |
|------|----------|--------|------------|
| Dec 22, 2025 | Data loss during update | Weeks of work lost | No backup checkpoint before changes |
| Dec 29, 2025 | OSAI references not removed | Legal liability risk | Instructions ignored, no verification |
| Dec 29, 2025 | v2.2.1 files not properly integrated | Type conflicts, broken build | Developer prioritized own schema over client requirements |

---

## 3. PRE-APPROVAL REQUIREMENTS

### 3.1 Mandatory Pre-Approval Checklist

Before ANY code change, the following MUST be completed and documented:

| Step | Requirement | Responsible | Sign-off Required |
|------|-------------|-------------|-------------------|
| 1 | **Task Acknowledgment** - Explicitly confirm understanding of instructions | Developer | Client |
| 2 | **Task Description** - Detailed written description of what will be changed | Developer | Client |
| 3 | **Plan/Roadmap** - Step-by-step execution plan with phases | Developer | Client |
| 4 | **Data Sources** - List all source files, references, documentation | Developer | Client |
| 5 | **Deliverables Specification** - Format, type, length, criteria | Developer | Client |
| 6 | **Timeline with KPIs** - Specific deadlines and success metrics | Developer | Client |
| 7 | **Resources/Cost** - Any resources or costs required | Developer | Client |
| 8 | **Risk Assessment** - Potential risks and mitigation strategies | Developer | Client |

### 3.2 Approval Gate

**NO WORK SHALL COMMENCE UNTIL:**
1. All 8 pre-approval items are documented
2. Client provides explicit written approval (e.g., "yes", "approved", "proceed")
3. Approval is timestamped and logged

**Template for Approval Request:**
```
## TASK APPROVAL REQUEST

**Task:** [Description]
**Acknowledgment:** I understand the following instructions: [list]
**Plan:** [Step-by-step]
**Sources:** [List of authoritative sources]
**Deliverables:** [Format, type, length]
**Timeline:** [Specific times]
**KPIs:** [Measurable success criteria]
**Resources:** [Required resources]

Awaiting your approval to proceed.
```

---

## 4. BACKUP AND CHECKPOINT REQUIREMENTS

### 4.1 Mandatory Backup Points

| Trigger | Action Required | Retention |
|---------|-----------------|-----------|
| Before ANY code change | Create checkpoint with description | 30 days minimum |
| Before database migration | Full database backup + schema export | 90 days minimum |
| Before deployment | Full codebase snapshot | Permanent |
| After successful deployment | Create "stable" checkpoint | Permanent |

### 4.2 Checkpoint Naming Convention

```
[DATE]-[TYPE]-[DESCRIPTION]
Example: 2025-12-29-PRE-MIGRATION-v221-integration
```

### 4.3 Backup Verification

After creating any backup:
1. Verify backup file exists and is accessible
2. Verify backup size is reasonable (not empty/corrupted)
3. Document backup location in deployment log

---

## 5. CHANGE EXECUTION PROTOCOL

### 5.1 Execution Rules

1. **ZERO DEVIATION** - Execute exactly as approved. Any deviation requires new approval.
2. **ONE CHANGE AT A TIME** - Complete and verify each change before proceeding to next.
3. **DOCUMENT EVERYTHING** - Log every file modified, every command executed.
4. **VERIFY AFTER EACH STEP** - Run tests/checks after each modification.

### 5.2 File Modification Protocol

For each file to be modified:

```
1. Log: "Modifying [filename] - Reason: [reason]"
2. Create file-level backup if critical
3. Make the change
4. Verify change is correct
5. Run relevant tests
6. Log: "Completed [filename] - Status: [success/fail]"
```

### 5.3 Prohibited Actions

The following are **STRICTLY PROHIBITED** without explicit client approval:

- Modifying database schema
- Changing authentication/authorization logic
- Altering branding or client-facing content
- Ignoring client-provided source files in favor of own implementations
- Using `git reset --hard` or destructive commands
- Deploying to production
- Making "improvements" not explicitly requested

---

## 6. TESTING REQUIREMENTS

### 6.1 Mandatory Test Gates

| Gate | Tests Required | Pass Criteria |
|------|----------------|---------------|
| Pre-Commit | TypeScript compilation | 0 errors |
| Pre-Commit | Unit tests | 100% pass |
| Pre-Deploy | Integration tests | 100% pass |
| Pre-Deploy | UI verification | Manual sign-off |
| Post-Deploy | Smoke tests | All critical paths work |

### 6.2 Test Execution Command

```bash
# Run all tests before any deployment
cd /home/ubuntu/ruzn-lite
pnpm test
npx tsc --noEmit
```

### 6.3 Test Failure Protocol

If ANY test fails:
1. STOP all deployment activities
2. Document the failure
3. Notify client immediately
4. Do NOT proceed until failure is resolved and approved

---

## 7. ROLLBACK PROCEDURES

### 7.1 Rollback Triggers

Immediate rollback is REQUIRED if:
- Any test fails after deployment
- Client reports critical issue
- Security vulnerability discovered
- Data integrity issue detected
- Any unauthorized change discovered

### 7.2 Rollback Procedure

```
Step 1: STOP - Halt all ongoing changes
Step 2: ASSESS - Document what went wrong
Step 3: NOTIFY - Inform client immediately
Step 4: ROLLBACK - Execute rollback command:
        webdev_rollback_checkpoint --version_id [last_stable_version]
Step 5: VERIFY - Confirm system is restored
Step 6: DOCUMENT - Full incident report
```

### 7.3 Rollback Command Reference

```bash
# Using Manus webdev tools
webdev_rollback_checkpoint --version_id [VERSION_ID]

# Manual git rollback (if webdev tools unavailable)
git checkout [COMMIT_HASH] -- .
git status
```

### 7.4 Post-Rollback Requirements

After any rollback:
1. Full incident report within 1 hour
2. Root cause analysis within 24 hours
3. Preventive measures documented
4. Client approval before any new changes

---

## 8. COMMUNICATION PROTOCOL

### 8.1 Mandatory Communications

| Event | Communication Required | Timeline |
|-------|----------------------|----------|
| Task received | Acknowledgment + clarifying questions | Immediate |
| Plan ready | Full plan for approval | Before any work |
| Checkpoint created | Confirmation with version ID | Immediate |
| Issue discovered | Alert with details | Immediate |
| Task completed | Summary + deliverables | Upon completion |
| Rollback executed | Full incident report | Within 1 hour |

### 8.2 Communication Format

All communications must include:
- Timestamp
- Clear subject/topic
- Specific details (not vague statements)
- Action items or requests clearly stated
- Attachments where relevant

---

## 9. AUDIT TRAIL REQUIREMENTS

### 9.1 Required Logs

Every deployment must maintain:

1. **Change Log** - What was changed, when, by whom
2. **Approval Log** - Client approvals with timestamps
3. **Test Log** - All test results
4. **Deployment Log** - Commands executed, outcomes
5. **Incident Log** - Any issues encountered

### 9.2 Log Retention

- All logs retained for minimum 1 year
- Critical incident logs retained permanently
- Logs must be accessible for audit at any time

---

## 10. COMPLIANCE VERIFICATION

### 10.1 Pre-Deployment Checklist

Before ANY deployment, verify:

- [ ] Client approval obtained and documented
- [ ] Backup checkpoint created and verified
- [ ] All source files are from client-approved sources
- [ ] No unauthorized modifications made
- [ ] All tests passing (0 errors)
- [ ] UI manually verified
- [ ] Rollback procedure tested and ready
- [ ] Communication sent to client

### 10.2 Non-Compliance Consequences

Failure to follow this protocol will result in:
1. Immediate halt of all work
2. Full incident documentation
3. Escalation to client
4. Potential service termination

---

## 11. DOCUMENT CONTROL

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 29, 2025 | Manus AI | Initial version |

**This document is effective immediately and supersedes all previous informal procedures.**

---

## APPENDIX A: Quick Reference Card

```
BEFORE ANY CHANGE:
1. Acknowledge instructions
2. Document plan
3. Get client approval
4. Create backup checkpoint
5. Verify backup

DURING CHANGE:
1. Follow approved plan exactly
2. One change at a time
3. Test after each change
4. Document everything

AFTER CHANGE:
1. Run all tests
2. Verify UI
3. Create stable checkpoint
4. Report to client

IF SOMETHING GOES WRONG:
1. STOP immediately
2. Notify client
3. Execute rollback
4. Document incident
```

---

**END OF DOCUMENT**
