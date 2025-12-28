/**
 * Ruzn-Lite Embeddings Types
 * 
 * Supports both cloud (OpenAI) and local (sovereign) embeddings backends.
 */

export type EmbeddingsBackend = "openai" | "local";

export type Embedder = (text: string) => Promise<number[]>;

export type LocalEmbedderConfig = {
  // If you run a local embeddings HTTP service, set LOCAL_EMBEDDINGS_URL
  // Example: http://localhost:8088/embed
  url?: string;
  // Optional headers for auth on-prem
  apiKeyHeaderName?: string; // e.g. "X-API-Key"
  apiKey?: string;
};
