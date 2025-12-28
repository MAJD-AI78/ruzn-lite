import { z } from "zod";

export const KnowledgeSearchInputSchema = z.object({
  query: z.string().min(2).max(2000),
  language: z.enum(["ar", "en", "auto"]).default("auto"),
  filters: z.object({
    source_type: z.array(
      z.enum([
        "law","royal_decree","supreme_court_ruling","gazette","regulation",
        "circular","standard","tender","guideline"
      ])
    ).optional(),
    date_from: z.string().optional(), // ISO date
    date_to: z.string().optional(),
    tags: z.array(z.string()).optional(),
    authority_min: z.number().min(0).max(1).default(0.7),
  }).default({ authority_min: 0.7 }),
  top_k: z.number().int().min(1).max(20).default(8),
});

export type KnowledgeSearchInput = z.infer<typeof KnowledgeSearchInputSchema>;

export type KnowledgeSearchResult = {
  doc_id: string;
  title: string;
  section?: string;
  article?: string;
  page_start?: number;
  page_end?: number;
  snippet: string;
  url?: string;
  score: number;
  hash?: string;
  source_type?: string;
  published_date?: string;
  tags?: string[];
  authority_score?: number;
};

export type KnowledgeSearchResponse = {
  results: KnowledgeSearchResult[];
  dataset_version: string;
  backend: "vectara" | "pgvector" | "qdrant" | "sqlite_vec" | "mock";
};
