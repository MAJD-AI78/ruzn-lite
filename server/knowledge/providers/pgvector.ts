/**
 * Ruzn-Lite PGVector Knowledge Provider
 * 
 * Semantic vector search using PostgreSQL + pgvector extension.
 * Supports both cloud (OpenAI) and local (sovereign) embeddings.
 */

import type { KnowledgeProvider } from "./provider";
import type { KnowledgeSearchInput, KnowledgeSearchResponse, KnowledgeSearchResult } from "../knowledge.types";
import { Client } from "pg";
import { getEmbedder } from "../embeddings";

/**
 * Convert number array to pgvector literal format
 * pgvector expects "[1,2,3]" not JSON with potential spacing
 */
function toPgVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

function normalizeScore(distance: number): number {
  // Convert cosine distance to similarity score (0-1)
  const s = 1 - distance;
  return Math.max(0, Math.min(1, s));
}

export class PgVectorKnowledgeProvider implements KnowledgeProvider {
  backend = "pgvector" as const;

  private getClient(): Client {
    const url = process.env.KNOWLEDGE_PGVECTOR_URL;
    if (!url) throw new Error("Missing KNOWLEDGE_PGVECTOR_URL");
    return new Client({ connectionString: url });
  }

  async search(input: KnowledgeSearchInput): Promise<KnowledgeSearchResponse> {
    // ═══════════════════════════════════════════════════════════════
    // SOVEREIGN MODE ENFORCEMENT
    // ═══════════════════════════════════════════════════════════════
    const sovereign = process.env.SOVEREIGN_MODE === "true";
    const embBackend = (process.env.EMBEDDINGS_BACKEND || "openai").toLowerCase();
    
    if (sovereign && embBackend === "openai") {
      throw new Error(
        "SOVEREIGN_MODE=true requires EMBEDDINGS_BACKEND=local (no external embedding calls allowed)."
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // GET EMBEDDER AND GENERATE QUERY VECTOR
    // ═══════════════════════════════════════════════════════════════
    const embed = getEmbedder();
    const queryEmbedding = await embed(input.query);

    // ═══════════════════════════════════════════════════════════════
    // EXECUTE PGVECTOR SEARCH
    // ═══════════════════════════════════════════════════════════════
    const client = this.getClient();
    await client.connect();
    
    try {
      const authorityMin = input.filters?.authority_min ?? 0.7;
      const sourceTypes = input.filters?.source_type?.length ? input.filters.source_type : null;
      const tags = input.filters?.tags?.length ? input.filters.tags : null;
      const dateFrom = input.filters?.date_from ?? null;
      const dateTo = input.filters?.date_to ?? null;

      const sql = `
        SELECT
          c.doc_id,
          d.title,
          c.section,
          c.article,
          c.page_start,
          c.page_end,
          c.snippet,
          d.url,
          (c.embedding <=> $1::vector) AS distance,
          d.source_type,
          d.published_date,
          d.tags,
          d.authority_score,
          c.hash
        FROM knowledge_chunks c
        JOIN knowledge_documents d ON d.doc_id = c.doc_id
        WHERE d.authority_score >= $2
          AND ($3::text[] IS NULL OR d.source_type = ANY($3))
          AND ($4::text[] IS NULL OR d.tags && $4)
          AND ($5::date IS NULL OR d.published_date >= $5::date)
          AND ($6::date IS NULL OR d.published_date <= $6::date)
        ORDER BY c.embedding <=> $1::vector
        LIMIT $7
      `;

      const res = await client.query(sql, [
        toPgVectorLiteral(queryEmbedding), // pgvector literal format
        authorityMin,
        sourceTypes,
        tags,
        dateFrom,
        dateTo,
        input.top_k ?? 8,
      ]);

      const results: KnowledgeSearchResult[] = res.rows.map((r: any) => ({
        doc_id: r.doc_id,
        title: r.title,
        section: r.section ?? undefined,
        article: r.article ?? undefined,
        page_start: r.page_start ?? undefined,
        page_end: r.page_end ?? undefined,
        snippet: r.snippet,
        url: r.url ?? undefined,
        score: normalizeScore(Number(r.distance)),
        hash: r.hash ?? undefined,
        source_type: r.source_type ?? undefined,
        published_date: r.published_date ? String(r.published_date) : undefined,
        tags: r.tags ?? undefined,
        authority_score: r.authority_score ?? undefined,
      }));

      return {
        backend: "pgvector",
        dataset_version: process.env.KNOWLEDGE_DATASET_VERSION || "pgv-v1",
        results,
      };
    } finally {
      await client.end();
    }
  }
}
