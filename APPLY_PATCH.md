# Apply Ruzn-Lite Patch Pack (Security + Auth + Knowledge pgvector)

This folder contains:
- improved security/auth/db utilities (from ruzn-lite-codebase-v1.txt)
- new Knowledge RAG layer with pgvector backend
- YAML registry + ingestion script + pgvector migration

## 1) Copy files into your repo
Copy the `client/`, `server/`, and `knowledge/` folders into the root of your `ruzn-lite` repo, overwriting when prompted.

## 2) Install deps
Add required deps:
- server: `pg`
- ingest: `yaml glob pdf-parse mammoth cheerio pg tsx`

Example:
`pnpm add pg`
`pnpm add -D tsx`
`pnpm add yaml glob pdf-parse mammoth cheerio`

## 3) Configure env
Add:
- KNOWLEDGE_BACKEND=pgvector
- KNOWLEDGE_PGVECTOR_URL=postgres://...
- OPENAI_API_KEY=...
- OPENAI_EMBED_MODEL=text-embedding-3-small
- EMBEDDING_DIM=1536
- KNOWLEDGE_DATASET_VERSION=pgv-v1

For gov mode:
- SOVEREIGN_MODE=true

## 4) Run pgvector migration
`psql "$KNOWLEDGE_PGVECTOR_URL" -f server/knowledge/migrations/0001_init_pgvector.sql`

## 5) Add docs
Put files under:
`knowledge/sources/oman/...`
Naming convention:
`<sourceId>__anything.pdf`
Example:
`oman_royal_decrees_library__rd_111_2011.pdf`

## 6) Ingest
`pnpm knowledge:pgvector:ingest`

## 7) Wire router into appRouter
In your main server router (e.g. `server/routers.ts`):
```
import { knowledgeRouter } from "./routers/knowledge";
...
knowledge: knowledgeRouter,
```

## 8) Client usage
Call `trpc.knowledge.search` from chat flow for legal/regulatory queries.
