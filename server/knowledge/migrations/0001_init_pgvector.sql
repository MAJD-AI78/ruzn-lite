CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_documents (
  doc_id           TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  source_type      TEXT NOT NULL,
  jurisdiction     TEXT NOT NULL DEFAULT 'oman',
  language         TEXT NOT NULL DEFAULT 'ar',
  url              TEXT,
  published_date   DATE,
  authority_score  DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  tags             TEXT[] NOT NULL DEFAULT '{}',
  hash             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  chunk_id     TEXT PRIMARY KEY,
  doc_id       TEXT NOT NULL REFERENCES knowledge_documents(doc_id) ON DELETE CASCADE,
  section      TEXT,
  article      TEXT,
  page_start   INT,
  page_end     INT,
  snippet      TEXT NOT NULL,
  embedding    vector(1536) NOT NULL,
  hash         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kdoc_source_type ON knowledge_documents(source_type);
CREATE INDEX IF NOT EXISTS idx_kdoc_published_date ON knowledge_documents(published_date);
CREATE INDEX IF NOT EXISTS idx_kdoc_authority ON knowledge_documents(authority_score);
CREATE INDEX IF NOT EXISTS idx_kdoc_tags ON knowledge_documents USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_kchunk_doc_id ON knowledge_chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_kchunk_embedding_ivfflat
ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
