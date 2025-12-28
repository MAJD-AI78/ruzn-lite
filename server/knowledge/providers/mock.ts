import type { KnowledgeProvider } from "./provider";
import type { KnowledgeSearchInput, KnowledgeSearchResponse } from "../knowledge.types";

export class MockKnowledgeProvider implements KnowledgeProvider {
  backend = "mock" as const;

  async search(input: KnowledgeSearchInput): Promise<KnowledgeSearchResponse> {
    const q = input.query.trim();
    return {
      backend: "mock",
      dataset_version: process.env.KNOWLEDGE_DATASET_VERSION || "demo-v1",
      results: [{
        doc_id: "oman_demo_doc",
        title: "Oman Legal Corpus (Demo)",
        section: "Article 1",
        article: "1",
        page_start: 1,
        page_end: 1,
        snippet: `(${q}) — Demo snippet. Replace with retrieved clause text.`,
        url: "https://example.com/official-source",
        score: 0.86,
        hash: "sha256:demo",
        source_type: "law",
        published_date: "2025-01-01",
        tags: ["audit","procedures"],
        authority_score: 0.9
      }],
    };
  }
}
