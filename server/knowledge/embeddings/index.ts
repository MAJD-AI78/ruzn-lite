/**
 * Ruzn-Lite Embeddings Factory
 * 
 * Returns the appropriate embedder based on EMBEDDINGS_BACKEND environment variable.
 * 
 * Backends:
 *  - "openai" (default): Uses OpenAI's embedding API
 *  - "local": Uses local HTTP service for sovereign deployments
 * 
 * Usage:
 *   import { getEmbedder } from "./embeddings";
 *   const embed = getEmbedder();
 *   const vector = await embed("search query");
 */

import type { Embedder, EmbeddingsBackend } from "./types";
import { makeOpenAIEmbedder } from "./openai";
import { makeLocalEmbedder } from "./local";

export function getEmbedder(): Embedder {
  const backend = (process.env.EMBEDDINGS_BACKEND || "openai").toLowerCase() as EmbeddingsBackend;

  if (backend === "local") {
    return makeLocalEmbedder();
  }

  // Default: openai
  return makeOpenAIEmbedder();
}

// Re-export types for convenience
export type { Embedder, EmbeddingsBackend, LocalEmbedderConfig } from "./types";
