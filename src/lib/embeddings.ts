import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Embedding Model ───────────────────────────────────────────

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 3072;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ─── LRU Cache for repeated queries ────────────────────────────

const CACHE_MAX_SIZE = 500;
const embeddingCache = new Map<string, number[]>();

function getCacheKey(text: string): string {
  // Simple hash for cache key
  return text.trim().toLowerCase().substring(0, 200);
}

function getCachedEmbedding(text: string): number[] | undefined {
  return embeddingCache.get(getCacheKey(text));
}

function setCachedEmbedding(text: string, embedding: number[]): void {
  const key = getCacheKey(text);
  if (embeddingCache.size >= CACHE_MAX_SIZE) {
    // Remove oldest entry (first key)
    const firstKey = embeddingCache.keys().next().value;
    if (firstKey !== undefined) {
      embeddingCache.delete(firstKey);
    }
  }
  embeddingCache.set(key, embedding);
}

// ─── Single Embedding ──────────────────────────────────────────

/**
 * Generate embedding for a single text (for queries).
 * Results are cached for repeated queries.
 */
export async function embedText(text: string): Promise<number[]> {
  const cached = getCachedEmbedding(text);
  if (cached) return cached;

  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  const embedding = result.embedding.values;

  setCachedEmbedding(text, embedding);
  return embedding;
}

// ─── Batch Embedding ───────────────────────────────────────────

/**
 * Generate embeddings for multiple texts (for indexing).
 * Processes in batches of up to 100 for API efficiency.
 */
export async function embedBatch(
  texts: string[],
  batchSize = 100
): Promise<number[][]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const result = await model.batchEmbedContents({
      requests: batch.map((text) => ({
        content: { role: "user", parts: [{ text }] },
      })),
    });

    const embeddings = result.embeddings.map((e) => e.values);
    allEmbeddings.push(...embeddings);

    // Rate limit: small delay between batches
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return allEmbeddings;
}

// ─── Exports ───────────────────────────────────────────────────

export { EMBEDDING_DIMENSIONS };
