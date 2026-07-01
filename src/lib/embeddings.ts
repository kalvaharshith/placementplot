import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";

// ─── Embedding Model ───────────────────────────────────────────

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 3072;

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY || "";
  return new GoogleGenerativeAI(apiKey);
}

// ─── LRU Cache for repeated queries ────────────────────────────

const CACHE_MAX_SIZE = 500;
const embeddingCache = new Map<string, number[]>();

function getCacheKey(text: string): string {
  // Compute secure SHA-256 hash to avoid collisions for similar texts/resumes
  return crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
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

  let retries = 3;
  let delay = 1000;
  while (retries > 0) {
    try {
      const model = getGenAI().getGenerativeModel({ model: EMBEDDING_MODEL });
      const result = await model.embedContent({
        content: { role: "user", parts: [{ text }] },
      });
      const embedding = result.embedding.values;
      setCachedEmbedding(text, embedding);
      return embedding;
    } catch (err: any) {
      retries--;
      const status = err.status || (err.message && err.message.includes("503") ? 503 : 0);
      const isTransient = status === 503 || status === 429 || 
        (err.message && (
          err.message.includes("demand") || 
          err.message.includes("rate limit") || 
          err.message.includes("exhausted") ||
          err.message.includes("Service Unavailable") ||
          err.message.includes("Too Many Requests")
        ));
      
      if (retries === 0 || !isTransient) {
        throw err;
      }
      console.warn(`Gemini embedding transient error (status ${status}). Retrying in ${delay}ms... remaining retries: ${retries}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // exponential backoff
    }
  }
  throw new Error("Failed after retries");
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
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    let result;
    let retries = 3;
    let delay = 1000;
    while (retries > 0) {
      try {
        const model = getGenAI().getGenerativeModel({ model: EMBEDDING_MODEL });
        result = await model.batchEmbedContents({
          requests: batch.map((text) => ({
            content: { role: "user", parts: [{ text }] },
          })),
        });
        break;
      } catch (err: any) {
        retries--;
        const status = err.status || (err.message && err.message.includes("503") ? 503 : 0);
        const isTransient = status === 503 || status === 429 || 
          (err.message && (
            err.message.includes("demand") || 
            err.message.includes("rate limit") || 
            err.message.includes("exhausted") ||
            err.message.includes("Service Unavailable") ||
            err.message.includes("Too Many Requests")
          ));
        
        if (retries === 0 || !isTransient) {
          throw err;
        }
        console.warn(`Gemini batch embedding transient error (status ${status}). Retrying in ${delay}ms... remaining retries: ${retries}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    if (!result) {
      throw new Error("Failed to embed batch after retries");
    }

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
