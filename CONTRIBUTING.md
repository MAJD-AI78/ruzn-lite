# Contributing to Ruzn-Lite

First off, thank you for considering contributing to Ruzn-Lite! It's people like you that make this platform better for government institutions worldwide.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Security Guidelines](#security-guidelines)
- [Community](#community)

---

## 📜 Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming, inclusive environment. By participating, you are expected to:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:

- Node.js 20+ installed
- pnpm package manager
- PostgreSQL 15+ with pgvector extension
- Redis 7+
- Git

### Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/ruzn-lite.git
cd ruzn-lite

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/ruzn-lite.git
```

---

## 💻 Development Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your local configuration
```

### 3. Setup Databases

```bash
# PostgreSQL with pgvector
psql -c "CREATE DATABASE ruzn_knowledge;"
psql -d ruzn_knowledge -c "CREATE EXTENSION IF NOT EXISTS vector;"
pnpm knowledge:pgvector:migrate

# MySQL (optional, for legacy features)
mysql -e "CREATE DATABASE ruzn_lite;"
```

### 4. Run Security Audit

```bash
pnpm security:audit
```

### 5. Start Development Server

```bash
pnpm dev
```

---

## 🤝 How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment details** (OS, Node version, etc.)

```markdown
### Bug Report Template

**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Environment**
- OS: [e.g., Ubuntu 22.04]
- Node: [e.g., 20.10.0]
- Database: [e.g., PostgreSQL 15]
```

### Suggesting Features

Feature requests are welcome! Please provide:

- **Use case** - Why is this feature needed?
- **Proposed solution** - How should it work?
- **Alternatives considered** - Other approaches you've thought of
- **Additional context** - Screenshots, mockups, etc.

### Code Contributions

1. **Check Issues** - Look for open issues or create one to discuss your idea
2. **Fork & Branch** - Create a feature branch from `main`
3. **Code** - Make your changes following our coding standards
4. **Test** - Ensure all tests pass
5. **Security Audit** - Run `pnpm security:audit`
6. **Pull Request** - Submit your PR for review

---

## 🔄 Pull Request Process

### Branch Naming

```
feature/short-description    # New features
fix/issue-number-description # Bug fixes
docs/what-changed            # Documentation
security/vulnerability-fix   # Security fixes
refactor/what-changed        # Code refactoring
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add Arabic language detection to LLM router
fix: resolve pgvector connection timeout issue
docs: update API documentation for knowledge search
security: patch XSS vulnerability in input sanitization
refactor: simplify embeddings provider factory
```

### PR Checklist

Before submitting your PR, ensure:

- [ ] Code follows the project's coding standards
- [ ] All tests pass (`pnpm test`)
- [ ] Security audit passes (`pnpm security:audit`)
- [ ] Documentation is updated if needed
- [ ] No console.log statements (use proper logging)
- [ ] No hardcoded secrets or API keys
- [ ] TypeScript types are properly defined
- [ ] PR description clearly explains the changes

### Review Process

1. **Automated Checks** - CI/CD runs tests and security audit
2. **Code Review** - At least one maintainer reviews the code
3. **Security Review** - Security-sensitive changes require additional review
4. **Merge** - Once approved, a maintainer will merge your PR

---

## 📝 Coding Standards

### TypeScript

```typescript
// ✅ Good: Explicit types, descriptive names
async function searchKnowledge(
  query: string,
  options: KnowledgeSearchOptions
): Promise<KnowledgeSearchResult[]> {
  // Implementation
}

// ❌ Bad: Implicit any, vague names
async function search(q, opts) {
  // Implementation
}
```

### File Structure

```
// Feature files should follow this pattern:
feature/
├── feature.types.ts      # Type definitions
├── feature.service.ts    # Business logic
├── feature.router.ts     # API routes
├── feature.test.ts       # Tests
└── index.ts              # Public exports
```

### Error Handling

```typescript
// ✅ Good: Proper error handling with context
try {
  const result = await pgClient.query(sql, params);
  return result.rows;
} catch (error) {
  logger.error('Knowledge search failed', { error, query });
  throw new DatabaseError('Failed to execute knowledge search', { cause: error });
}

// ❌ Bad: Swallowing errors
try {
  const result = await pgClient.query(sql, params);
  return result.rows;
} catch (error) {
  return []; // Silent failure
}
```

### Security

```typescript
// ✅ Good: Input validation with Zod
const SearchInputSchema = z.object({
  query: z.string().min(1).max(1000),
  top_k: z.number().int().min(1).max(50).default(8),
});

// ❌ Bad: Direct user input
const results = await search(req.body.query); // Unvalidated!
```

---

## 🔐 Security Guidelines

### Mandatory Security Practices

1. **Never commit secrets** - Use environment variables
2. **Validate all inputs** - Use Zod schemas
3. **Use protectedProcedure** - No public endpoints for sensitive data
4. **Run security audit** - Before every PR
5. **Report vulnerabilities privately** - See [SECURITY.md](SECURITY.md)

### Security Review Required For

- Authentication/authorization changes
- Database query modifications
- New API endpoints
- Dependency updates
- Environment variable changes

---

## 🌍 Community

### Getting Help

- **GitHub Issues** - For bugs and feature requests
- **Discussions** - For questions and ideas
- **Documentation** - Check `/docs` folder

### Recognition

Contributors are recognized in:
- Release notes
- Contributors list
- Annual contributor spotlight

---

## 📄 License

By contributing to Ruzn-Lite, you agree that your contributions will be licensed under the Apache License 2.0.

---

Thank you for contributing to Ruzn-Lite! 🎉
