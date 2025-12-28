/**
 * Ruzn-Lite PGVector Document Ingestion Script
 * 
 * Ingests PDF/DOCX documents into the pgvector knowledge base.
 * Supports both cloud (OpenAI) and local (sovereign) embeddings.
 * 
 * Usage:
 *   pnpm tsx knowledge/scripts/ingest_pgvector.ts
 *   # or
 *   pnpm knowledge:pgvector:ingest
 * 
 * Expected directory structure:
 *   knowledge/sources/oman/<sourceId>__<description>.pdf
 * 
 * Environment:
 *   - KNOWLEDGE_PGVECTOR_URL=postgres://...
 *   - EMBEDDINGS_BACKEND=openai|local
 *   - OPENAI_API_KEY (if using openai)
 *   - LOCAL_EMBEDDINGS_URL (if using local)
 *   - SOVEREIGN_MODE=true|false
 */

import fs from "fs";
import path from "path";
import { glob } from "glob";
import { Client } from "pg";
import { parse as parseYaml } from "yaml";
import { getEmbedder } from "../../server/knowledge/embeddings";

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");
const SOURCES_DIR = path.join(KNOWLEDGE_DIR, "sources");
const LINKS_FILE = path.join(KNOWLEDGE_DIR, "links", "oman_sources.yaml");

const CHUNK_SIZE = 1000; // Characters per chunk
const CHUNK_OVERLAP = 200; // Overlap between chunks

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface SourceConfig {
  id: string;
  title: string;
  source_type: string;
  authority_score: number;
  tags: string[];
}

interface DocumentChunk {
  doc_id: string;
  snippet: string;
  section?: string;
  article?: string;
  page_start?: number;
  page_end?: number;
  hash: string;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Convert number array to pgvector literal format
 * pgvector expects "[1,2,3]" not JSON with potential spacing
 */
function toPgVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start < 0) start = 0;
    if (end === text.length) break;
  }
  
  return chunks;
}

async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const pdfParse = await import("pdf-parse");
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse.default(buffer);
    return data.text;
  } catch (err) {
    console.error(`Failed to parse PDF ${filePath}:`, err);
    return "";
  }
}

async function extractTextFromDOCX(filePath: string): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (err) {
    console.error(`Failed to parse DOCX ${filePath}:`, err);
    return "";
  }
}

async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case ".pdf":
      return extractTextFromPDF(filePath);
    case ".docx":
      return extractTextFromDOCX(filePath);
    case ".txt":
    case ".md":
      return fs.readFileSync(filePath, "utf-8");
    default:
      console.warn(`Unsupported file type: ${ext}`);
      return "";
  }
}

function parseSourceId(filename: string): string | null {
  // Expected format: sourceId__description.pdf
  const match = filename.match(/^([^_]+(?:_[^_]+)*)__/);
  return match ? match[1] : null;
}

// ═══════════════════════════════════════════════════════════════
// MAIN INGESTION
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log("🚀 Ruzn-Lite PGVector Document Ingestion\n");

  // ─────────────────────────────────────────────────────────────
  // SOVEREIGN MODE ENFORCEMENT
  // ─────────────────────────────────────────────────────────────
  const sovereign = process.env.SOVEREIGN_MODE === "true";
  const embBackend = (process.env.EMBEDDINGS_BACKEND || "openai").toLowerCase();
  
  if (sovereign && embBackend === "openai") {
    throw new Error(
      "SOVEREIGN_MODE=true requires EMBEDDINGS_BACKEND=local for ingest. " +
      "Set EMBEDDINGS_BACKEND=local and LOCAL_EMBEDDINGS_URL."
    );
  }

  console.log(`Mode: ${sovereign ? "SOVEREIGN (local embeddings)" : "CLOUD (OpenAI embeddings)"}`);
  console.log(`Embeddings Backend: ${embBackend}\n`);

  // ─────────────────────────────────────────────────────────────
  // LOAD SOURCE CONFIGURATION
  // ─────────────────────────────────────────────────────────────
  let sourcesConfig: Record<string, SourceConfig> = {};
  
  if (fs.existsSync(LINKS_FILE)) {
    const yaml = fs.readFileSync(LINKS_FILE, "utf-8");
    const parsed = parseYaml(yaml);
    
    if (parsed.sources) {
      for (const src of parsed.sources) {
        sourcesConfig[src.id] = {
          id: src.id,
          title: src.title,
          source_type: src.source_type,
          authority_score: src.authority_score || 0.8,
          tags: src.tags || [],
        };
      }
    }
    console.log(`✓ Loaded ${Object.keys(sourcesConfig).length} source configs from YAML\n`);
  } else {
    console.log("⚠ No oman_sources.yaml found, using defaults\n");
  }

  // ─────────────────────────────────────────────────────────────
  // FIND DOCUMENTS
  // ─────────────────────────────────────────────────────────────
  const files = await glob(`${SOURCES_DIR}/**/*.{pdf,docx,txt,md}`);
  console.log(`Found ${files.length} documents to process\n`);

  if (files.length === 0) {
    console.log("No documents found. Add files to knowledge/sources/oman/");
    process.exit(0);
  }

  // ─────────────────────────────────────────────────────────────
  // CONNECT TO DATABASE
  // ─────────────────────────────────────────────────────────────
  const pgUrl = process.env.KNOWLEDGE_PGVECTOR_URL;
  if (!pgUrl) {
    throw new Error("Missing KNOWLEDGE_PGVECTOR_URL environment variable");
  }

  const client = new Client({ connectionString: pgUrl });
  await client.connect();
  console.log("✓ Connected to PostgreSQL\n");

  // ─────────────────────────────────────────────────────────────
  // GET EMBEDDER
  // ─────────────────────────────────────────────────────────────
  const embed = getEmbedder();

  // ─────────────────────────────────────────────────────────────
  // PROCESS DOCUMENTS
  // ─────────────────────────────────────────────────────────────
  let totalChunks = 0;
  let totalDocs = 0;

  for (const filePath of files) {
    const filename = path.basename(filePath);
    const sourceId = parseSourceId(filename);
    const docId = hashString(filePath);
    
    console.log(`\n📄 Processing: ${filename}`);
    
    // Get source config
    const config = sourceId ? sourcesConfig[sourceId] : null;
    const title = config?.title || filename;
    const sourceType = config?.source_type || "document";
    const authorityScore = config?.authority_score || 0.5;
    const tags = config?.tags || [];

    // Extract text
    const text = await extractText(filePath);
    if (!text || text.length < 50) {
      console.log(`   ⚠ Skipping (no text extracted)`);
      continue;
    }

    // Insert document record
    await client.query(
      `INSERT INTO knowledge_documents (doc_id, title, source_type, authority_score, tags, url, published_date)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (doc_id) DO UPDATE SET
         title = EXCLUDED.title,
         source_type = EXCLUDED.source_type,
         authority_score = EXCLUDED.authority_score,
         tags = EXCLUDED.tags`,
      [docId, title, sourceType, authorityScore, tags, filePath]
    );

    // Clear old chunks for this document
    await client.query(`DELETE FROM knowledge_chunks WHERE doc_id = $1`, [docId]);

    // Chunk and embed
    const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
    console.log(`   ✓ Extracted ${text.length} chars → ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      const snippet = chunks[i];
      const chunkId = `${docId}-chunk-${i}`;
      const chunkHash = hashString(`${docId}-${i}-${snippet.slice(0, 50)}`);
      
      try {
        // Generate embedding
        const embedding = await embed(snippet);
        
        // Insert chunk with all required fields
        await client.query(
          `INSERT INTO knowledge_chunks (chunk_id, doc_id, snippet, embedding, hash, page_start)
           VALUES ($1, $2, $3, $4::vector, $5, $6)
           ON CONFLICT (chunk_id) DO UPDATE SET
             snippet = EXCLUDED.snippet,
             embedding = EXCLUDED.embedding,
             hash = EXCLUDED.hash`,
          [chunkId, docId, snippet, toPgVectorLiteral(embedding), chunkHash, i + 1]
        );
        
        totalChunks++;
        
        // Progress indicator
        if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
          process.stdout.write(`   → Embedded ${i + 1}/${chunks.length} chunks\r`);
        }
      } catch (err) {
        console.error(`\n   ✗ Failed to embed chunk ${i}:`, err);
      }
    }
    
    console.log(`   ✓ Ingested ${chunks.length} chunks`);
    totalDocs++;
  }

  // ─────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────
  await client.end();

  console.log("\n" + "═".repeat(50));
  console.log("✅ INGESTION COMPLETE");
  console.log("═".repeat(50));
  console.log(`   Documents processed: ${totalDocs}`);
  console.log(`   Total chunks embedded: ${totalChunks}`);
  console.log(`   Dataset version: ${process.env.KNOWLEDGE_DATASET_VERSION || "pgv-v1"}`);
}

main().catch((err) => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
});
