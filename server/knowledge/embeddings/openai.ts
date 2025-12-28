/**
 * Ruzn-Lite OpenAI Embeddings Provider
 * 
 * Uses OpenAI's embedding API for semantic vector search.
 * Default model: text-embedding-3-small (1536 dimensions)
 */

import type { Embedder } from "./types";

const DEFAULT_MODEL = "text-embedding-3-small";

export function makeOpenAIEmbedder(): Embedder {
  return async (text: string) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY for EMBEDDINGS_BACKEND=openai");
    }

    const model = process.env.OPENAI_EMBED_MODEL || DEFAULT_MODEL;

    const resp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: text }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`OpenAI embeddings failed: ${resp.status} ${body}`);
    }

    const json = (await resp.json()) as any;
    return json.data[0].embedding as number[];
  };
}
