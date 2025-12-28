import type { KnowledgeSearchInput, KnowledgeSearchResponse } from "../knowledge.types";

export type KnowledgeBackend = "vectara" | "pgvector" | "qdrant" | "sqlite_vec" | "mock";

export interface KnowledgeProvider {
  backend: KnowledgeBackend;
  search(input: KnowledgeSearchInput): Promise<KnowledgeSearchResponse>;
}
