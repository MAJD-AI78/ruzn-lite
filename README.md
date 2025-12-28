# Ruzn-Lite

<div align="center">

![Version](https://img.shields.io/badge/version-2.2.1-blue.svg)
![License](https://img.shields.io/badge/license-Apache%202.0-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![Node](https://img.shields.io/badge/Node.js-20+-green.svg)
![Status](https://img.shields.io/badge/status-Production%20Ready-brightgreen.svg)

**AI-Powered Government Audit & Compliance Platform**

*Intelligent document analysis, regulatory compliance, and audit workflow automation*

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 🎯 Overview

Ruzn-Lite is an enterprise-grade AI platform designed for government audit institutions and regulatory bodies. It provides intelligent document analysis, multi-lingual support (Arabic/English), and sovereign deployment capabilities for sensitive government operations.

### Key Capabilities

- **🔍 Semantic Knowledge Search** - PGVector-powered RAG for legal document retrieval
- **🤖 Multi-Model LLM Orchestration** - Intelligent routing across multiple AI providers
- **🏛️ Sovereign Deployment** - Air-gapped mode with local embeddings for government use
- **🌐 Bilingual Support** - Native Arabic and English processing
- **🔐 Enterprise Security** - Role-based access, rate limiting, input sanitization
- **📊 Audit Workflow Automation** - Complaint processing, legislative analysis, report generation

---

## ✨ Features

### AI & Knowledge Management

| Feature | Description |
|---------|-------------|
| **Semantic Search** | Vector similarity search using PGVector + OpenAI embeddings |
| **RAG Pipeline** | Retrieval-Augmented Generation for accurate, cited responses |
| **Document Ingestion** | PDF/DOCX parsing with automatic chunking and embedding |
| **Authority Scoring** | Source credibility ranking (0-1) for official documents |
| **Multi-Provider LLM** | DeepSeek, OpenAI, Gemini, Claude, Kimi with automatic fallback |

### Deployment Modes

| Mode | Use Case | External APIs | 
|------|----------|---------------|
| `PUBLIC_MODE` | Demos, presentations | ✅ Allowed |
| `GOV_DEMO_MODE` | Private government demos | ✅ Allowed |
| `SOVEREIGN_MODE` | Production government (air-gapped) | ❌ Blocked |

### Security Features

- ✅ Server-validated authentication (no client-side bypasses)
- ✅ Redis-based rate limiting with sliding window
- ✅ Input sanitization with Zod schemas
- ✅ LLM prompt injection protection
- ✅ Pre-deployment security audit tool
- ✅ No hardcoded secrets or demo data fallbacks

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ with pgvector extension
- Redis 7+
- MySQL 8+ (optional, for legacy features)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ruzn-lite.git
cd ruzn-lite

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Setup PostgreSQL with pgvector
psql -c "CREATE EXTENSION IF NOT EXISTS vector;"
pnpm knowledge:pgvector:migrate

# Run security audit
pnpm security:audit

# Start development server
pnpm dev
```

### Document Ingestion

```bash
# Place documents in knowledge/sources/
cp your-documents/*.pdf knowledge/sources/

# Run ingestion pipeline
pnpm knowledge:pgvector:ingest
```

---

## 📁 Project Structure

```
ruzn-lite/
├── client/                    # Frontend application
│   └── src/
│       └── context/
│           └── AuthContext.tsx    # Authentication provider
│
├── server/                    # Backend services
│   ├── _core/
│   │   └── llm/              # LLM orchestration layer
│   │       ├── orchestrator.ts    # Multi-provider routing
│   │       ├── config.ts          # Model configurations
│   │       └── providers/         # Provider implementations
│   │
│   ├── db/                   # Database layer (MySQL)
│   │   ├── connection.ts         # Connection pooling
│   │   └── knowledge.ts          # Legacy full-text search
│   │
│   ├── knowledge/            # Vector knowledge base
│   │   ├── embeddings/           # Embedding providers
│   │   │   ├── openai.ts         # OpenAI embeddings
│   │   │   └── local.ts          # Local/sovereign embeddings
│   │   ├── providers/
│   │   │   └── pgvector.ts       # PGVector semantic search
│   │   └── migrations/           # Database schemas
│   │
│   ├── routers/              # API routes
│   │   └── knowledge.ts          # Knowledge search API
│   │
│   ├── middleware/           # Express middleware
│   │   └── rateLimiter.ts        # Rate limiting
│   │
│   └── utils/                # Utilities
│       ├── sanitize.ts           # Input validation
│       └── errorHandler.ts       # Error handling
│
├── knowledge/                # Knowledge base assets
│   ├── links/                    # Source registry
│   ├── scripts/                  # Ingestion scripts
│   └── sources/                  # Document storage
│
├── tools/                    # Development tools
│   └── security_audit.ts         # Security scanner
│
└── docs/                     # Documentation
```

---

## 🤖 LLM Configuration

### Supported Providers

| Provider | Models | Status | Best For |
|----------|--------|--------|----------|
| DeepSeek | R1, V3 | ✅ Implemented | Arabic, Reasoning |
| OpenAI | GPT-4o, GPT-5 | 🔜 Planned | Premium Quality |
| Google | Gemini 2.5 | 🔜 Planned | Speed, Cost |
| Anthropic | Claude 4 | 🔜 Planned | Analysis |
| Moonshot | Kimi-k2 | 🔜 Planned | Long Documents |

### Routing Rules

```typescript
// Intelligent routing based on task type and language
'complaints:arabic'  → DeepSeek R1 → Claude 4 → GPT-5
'complaints:english' → GPT-5 → Claude 4 → DeepSeek R1
'legislative:*'      → DeepSeek R1 → Claude 4 → GPT-5
'general:*'          → Gemini Flash → DeepSeek V3 → GPT-4o
```

---

## 🔐 Security

### Pre-Deployment Audit

```bash
# Run security audit before any deployment
PUBLIC_MODE=true pnpm security:audit

# Expected output:
# ✅ No security issues found!
```

### Security Checklist

- [ ] All API routes use `protectedProcedure`
- [ ] No `sessionStorage` authentication
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] API keys in environment variables only
- [ ] Security audit passes

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

---

## 🏛️ Sovereign Mode

For government deployments requiring air-gapped operation:

```bash
# .env configuration
SOVEREIGN_MODE=true
EMBEDDINGS_BACKEND=local
LOCAL_EMBEDDINGS_URL=http://your-local-embeddings:8088/embed
KNOWLEDGE_BACKEND=pgvector
```

**Sovereign mode enforces:**
- ❌ No calls to OpenAI, DeepSeek, or external APIs
- ✅ Local embeddings service required
- ✅ On-premise vector database only
- ✅ All data stays within network boundary

---

## 📊 API Reference

### Knowledge Search

```typescript
POST /api/knowledge.search

// Request
{
  "query": "conflict of interest regulations",
  "top_k": 8,
  "filters": {
    "source_type": ["law", "regulation"],
    "authority_min": 0.7,
    "date_from": "2020-01-01"
  }
}

// Response
{
  "backend": "pgvector",
  "dataset_version": "pgv-v1",
  "results": [
    {
      "doc_id": "abc123",
      "title": "Public Funds Protection Act",
      "snippet": "Article 4 establishes...",
      "score": 0.89,
      "authority_score": 0.95,
      "source_type": "law"
    }
  ]
}
```

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run security audit
pnpm security:audit

# Test knowledge search
curl -X POST http://localhost:3000/api/knowledge.search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "audit procedures"}'
```

---

## 📦 Deployment

### Docker

```bash
docker-compose up -d
```

### Manual

```bash
# Build
pnpm build

# Production
NODE_ENV=production pnpm start
```

### Environment Variables

See [.env.example](.env.example) for complete configuration reference.

---

## 🗺️ Roadmap

- [x] PGVector semantic search
- [x] Multi-model LLM orchestration
- [x] Sovereign deployment mode
- [x] Security audit tooling
- [ ] OpenAI/Gemini/Claude providers
- [ ] Real-time collaboration
- [ ] Audit trail & reporting
- [ ] Mobile application

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Development setup
git clone https://github.com/YOUR_USERNAME/ruzn-lite.git
cd ruzn-lite
pnpm install
pnpm dev
```

---

## 📄 License

This project is licensed under the Apache License 2.0 - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [PGVector](https://github.com/pgvector/pgvector) - Vector similarity search
- [DeepSeek](https://deepseek.com) - LLM provider
- [tRPC](https://trpc.io) - Type-safe API layer
- [Drizzle ORM](https://orm.drizzle.team) - Database toolkit

---

<div align="center">

**Built with ❤️ for Government Digital Transformation**

[Report Bug](../../issues) • [Request Feature](../../issues) • [Documentation](./docs)

</div>
