import type { KnowledgeProvider } from "./provider";
import { MockKnowledgeProvider } from "./mock";
import { PgVectorKnowledgeProvider } from "./pgvector";

export function getKnowledgeProvider(): KnowledgeProvider {
  const backend = (process.env.KNOWLEDGE_BACKEND || "mock").toLowerCase();
  switch (backend) {
    case "pgvector":
      return new PgVectorKnowledgeProvider();
    case "mock":
    default:
      return new MockKnowledgeProvider();
  }
}
