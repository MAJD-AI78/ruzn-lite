# Security Policy

## 🔐 Security Overview

Ruzn-Lite is designed for government audit institutions handling sensitive data. Security is our top priority.

---

## 📋 Supported Versions

| Version | Supported          | Notes |
| ------- | ------------------ | ----- |
| 2.2.x   | ✅ Active support  | Current stable release |
| 2.1.x   | ⚠️ Security fixes only | |
| 2.0.x   | ❌ End of life     | Please upgrade |
| < 2.0   | ❌ End of life     | Please upgrade |

---

## 🚨 Reporting a Vulnerability

### Do NOT Report Security Issues Publicly

If you discover a security vulnerability, please **DO NOT** create a public GitHub issue.

### Private Disclosure Process

1. **Email**: Send details to `security@acuterium.tech` (replace with your actual security email)
2. **Subject**: `[SECURITY] Ruzn-Lite: Brief description`
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

| Timeline | Action |
|----------|--------|
| 24 hours | Acknowledgment of your report |
| 72 hours | Initial assessment and severity rating |
| 7 days | Detailed response with remediation plan |
| 30-90 days | Fix developed, tested, and released |

### Safe Harbor

We consider security research conducted in good faith to be authorized. We will not pursue legal action against researchers who:

- Make a good faith effort to avoid privacy violations
- Avoid destruction of data
- Do not exploit vulnerabilities beyond proof of concept
- Report findings promptly and privately

---

## 🛡️ Security Architecture

### Authentication

```
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Client ──► AuthContext ──► Server Validation ──► JWT/Session│
│                                                             │
│  ❌ NO client-side only authentication                      │
│  ❌ NO sessionStorage gates                                 │
│  ✅ Server-validated tokens only                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### API Security

- **All endpoints**: Protected by `protectedProcedure` (requires authentication)
- **Rate limiting**: Redis-based sliding window (configurable limits)
- **Input validation**: Zod schemas on all inputs
- **Output sanitization**: Prevent data leakage

### Data Security

- **Encryption at rest**: Database encryption (configure at DB level)
- **Encryption in transit**: TLS 1.3 required
- **Secrets management**: Environment variables only (never in code)
- **Audit logging**: All sensitive operations logged

---

## 🔒 Security Features

### Built-in Protections

| Feature | Description | Location |
|---------|-------------|----------|
| Input Sanitization | Zod validation + LLM sanitization | `server/utils/sanitize.ts` |
| Rate Limiting | Sliding window with Redis | `server/middleware/rateLimiter.ts` |
| Auth Context | Server-validated authentication | `client/src/context/AuthContext.tsx` |
| Error Handling | No stack traces in production | `server/utils/errorHandler.ts` |
| Security Audit | Pre-deployment vulnerability scan | `tools/security_audit.ts` |

### Security Audit Tool

Run before every deployment:

```bash
# Must pass with no issues
PUBLIC_MODE=true pnpm security:audit

# Expected output:
# ✅ No security issues found!
```

The audit checks for:
- `publicProcedure` on sensitive endpoints
- `sessionStorage` authentication bypasses
- Client-specific identifiers in PUBLIC builds
- Hardcoded secrets

---

## 🏛️ Sovereign Mode Security

For air-gapped government deployments:

```bash
# Configuration
SOVEREIGN_MODE=true
EMBEDDINGS_BACKEND=local
```

### Sovereign Mode Guarantees

| Guarantee | Enforcement |
|-----------|-------------|
| No external API calls | Runtime block on OpenAI, etc. |
| Local embeddings only | Throws error if EMBEDDINGS_BACKEND≠local |
| On-premise data only | PGVector/local DB required |
| Network isolation | No outbound connections |

### Verification

```typescript
// Automatic enforcement in code
if (sovereign && embBackend === "openai") {
  throw new Error("SOVEREIGN_MODE requires EMBEDDINGS_BACKEND=local");
}
```

---

## 📝 Security Checklist

### Before Development

- [ ] Read this security policy
- [ ] Understand authentication flow
- [ ] Review existing security patterns

### During Development

- [ ] Use `protectedProcedure` for all sensitive endpoints
- [ ] Validate all inputs with Zod schemas
- [ ] Never log sensitive data (tokens, passwords, PII)
- [ ] Use parameterized queries (prevent SQL injection)
- [ ] Sanitize LLM inputs (prevent prompt injection)

### Before Commit

- [ ] No hardcoded secrets
- [ ] No `console.log` with sensitive data
- [ ] Security audit passes
- [ ] No new dependencies without review

### Before Deployment

- [ ] All environment variables set
- [ ] Secrets rotated if needed
- [ ] TLS configured
- [ ] Rate limits appropriate for load
- [ ] Security audit passes

---

## 🔑 Secret Management

### Required Secrets

| Secret | Purpose | Rotation |
|--------|---------|----------|
| `JWT_SECRET` | Token signing | Quarterly |
| `SESSION_SECRET` | Session encryption | Quarterly |
| `DEEPSEEK_API_KEY` | LLM provider | As needed |
| `OPENAI_API_KEY` | Embeddings | As needed |
| `DATABASE_URL` | DB connection | On compromise |

### Secret Generation

```bash
# Generate secure secrets
openssl rand -base64 32  # For JWT_SECRET, SESSION_SECRET
```

### Never Do This

```typescript
// ❌ NEVER hardcode secrets
const apiKey = "sk-1234567890abcdef";

// ❌ NEVER commit .env files
// Add to .gitignore: .env, .env.local, .env.production

// ❌ NEVER log secrets
console.log(`API Key: ${process.env.API_KEY}`);
```

---

## 🐛 Known Security Considerations

### LLM Prompt Injection

**Risk**: Malicious input could manipulate LLM behavior

**Mitigation**:
- Input sanitization in `server/utils/sanitize.ts`
- System prompts are protected
- User input clearly delineated

### SQL Injection

**Risk**: Malicious queries could access/modify data

**Mitigation**:
- Parameterized queries everywhere
- Drizzle ORM with type safety
- No raw SQL concatenation

### Authentication Bypass

**Risk**: Accessing protected resources without auth

**Mitigation**:
- Server-validated tokens only
- No client-side auth gates
- Security audit catches violations

---

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

---

## 📞 Contact

- **Security Email**: security@acuterium.tech
- **Response Time**: 24-72 hours
- **PGP Key**: Available upon request

---

*Last updated: December 2025*
