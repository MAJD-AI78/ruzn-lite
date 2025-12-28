/**
 * Ruzn-Lite Local Embeddings Provider (Sovereign Mode)
 * 
 * For government/sovereign deployments that cannot use external APIs.
 * 
 * Options:
 *  A) HTTP service that returns { embedding: number[] } for a given text
 *  B) Replace this implementation with an on-prem model call
 *
 * Environment Variables:
 *  - LOCAL_EMBEDDINGS_URL=http://localhost:8088/embed
 *  - LOCAL_EMBEDDINGS_API_KEY=... (optional)
 *  - LOCAL_EMBEDDINGS_API_KEY_HEADER=X-API-Key (optional, default: X-API-Key)
 * 
 * Example local service response:
 *   POST /embed { "text": "query text" }
 *   Response: { "embedding": [0.1, 0.2, ...] }
 */

import type { Embedder, LocalEmbedderConfig } from "./types";

export function makeLocalEmbedder(config?: LocalEmbedderConfig): Embedder {
  const url = config?.url || process.env.LOCAL_EMBEDDINGS_URL;
  if (!url) {
    throw new Error("Missing LOCAL_EMBEDDINGS_URL for EMBEDDINGS_BACKEND=local");
  }

  const apiKey = config?.apiKey || process.env.LOCAL_EMBEDDINGS_API_KEY;
  const headerName =
    config?.apiKeyHeaderName ||
    process.env.LOCAL_EMBEDDINGS_API_KEY_HEADER ||
    "X-API-Key";

  return async (text: string) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) headers[headerName] = apiKey;

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ text }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Local embeddings failed: ${resp.status} ${body}`);
    }

    const json = (await resp.json()) as any;
    const emb = json.embedding as number[] | undefined;
    if (!emb || !Array.isArray(emb)) {
      throw new Error("Local embeddings response missing `embedding` array");
    }
    return emb;
  };
}
