import { createServerSupabase, type KBType, type MatchDocumentResult } from "./supabase";
import { embedText, embedBatch, EMBEDDING_DIMENSIONS } from "./embeddings";
import type { Chunk } from "./chunker";

// ─── Core RAG Engine ────────────────────────────────────────────
// Retrieval Augmented Generation: embed → search → augment → generate

// ─── Indexing (Write to Vector Store) ──────────────────────────

/**
 * Index a single document into the vector store.
 */
export async function indexDocument(
  content: string,
  metadata: Record<string, unknown>,
  kbType: KBType
): Promise<void> {
  const supabase = createServerSupabase();
  const embedding = await embedText(content);

  const { error } = await supabase.from("documents").insert({
    content,
    embedding,
    metadata,
    kb_type: kbType,
  });

  if (error) {
    throw new Error(`Failed to index document: ${error.message}`);
  }
}

/**
 * Index multiple chunks in batch.
 * Uses batch embedding for efficiency.
 */
export async function indexChunks(
  chunks: Chunk[],
  kbType: KBType,
  batchSize = 50
): Promise<{ indexed: number; errors: number }> {
  const supabase = createServerSupabase();
  let indexed = 0;
  let errors = 0;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map((c) => c.content);
    const embeddings = await embedBatch(texts);

    const rows = batch.map((chunk, j) => ({
      content: chunk.content,
      embedding: embeddings[j],
      metadata: chunk.metadata,
      kb_type: kbType,
    }));

    const { error } = await supabase.from("documents").insert(rows);

    if (error) {
      console.error(`Batch indexing error at offset ${i}:`, error.message);
      errors += batch.length;
    } else {
      indexed += batch.length;
    }
  }

  return { indexed, errors };
}

// ─── Retrieval (Search Vector Store) ───────────────────────────

/**
 * Hybrid search: vector similarity + full-text keyword matching.
 * Calls the `match_documents` Supabase RPC function.
 */
export async function hybridSearch(
  query: string,
  kbType: KBType,
  options?: {
    filters?: Record<string, unknown>;
    topK?: number;
    vectorWeight?: number;
    textWeight?: number;
  }
): Promise<MatchDocumentResult[]> {
  const supabase = createServerSupabase();
  const queryEmbedding = await embedText(query);

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    query_text: query,
    filter_kb_type: kbType,
    filter_metadata: options?.filters || {},
    match_count: options?.topK || 5,
    vector_weight: options?.vectorWeight || 0.7,
    text_weight: options?.textWeight || 0.3,
  });

  if (error) {
    console.error("Hybrid search error:", error.message);
    // Fallback to pure vector search
    return vectorSearch(query, kbType, options?.topK || 5);
  }

  return data as MatchDocumentResult[];
}

/**
 * Pure vector similarity search (fallback).
 */
export async function vectorSearch(
  query: string,
  kbType: KBType,
  topK = 5
): Promise<MatchDocumentResult[]> {
  const supabase = createServerSupabase();
  const queryEmbedding = await embedText(query);

  const { data, error } = await supabase.rpc("vector_search", {
    query_embedding: queryEmbedding,
    filter_kb_type: kbType,
    match_count: topK,
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return data as MatchDocumentResult[];
}

// ─── RAG Pipeline ──────────────────────────────────────────────

/**
 * Full RAG pipeline: retrieve → format context → build augmented prompt.
 */
export async function retrieveAndAugment(
  query: string,
  kbType: KBType,
  options?: {
    filters?: Record<string, unknown>;
    topK?: number;
    contextHeader?: string;
  }
): Promise<{
  context: string;
  chunks: MatchDocumentResult[];
}> {
  const chunks = await hybridSearch(query, kbType, {
    filters: options?.filters,
    topK: options?.topK || 5,
  });

  const context = formatRetrievedContext(chunks, options?.contextHeader);

  return { context, chunks };
}

/**
 * Format retrieved chunks into a context string for prompt injection.
 */
function formatRetrievedContext(
  chunks: MatchDocumentResult[],
  header?: string
): string {
  if (chunks.length === 0) return "";

  const lines = chunks.map(
    (chunk, i) =>
      `[Source ${i + 1}] (relevance: ${(chunk.similarity * 100).toFixed(1)}%)\n${chunk.content}`
  );

  return `${header || "RETRIEVED CONTEXT FROM KNOWLEDGE BASE:"}\n\n${lines.join("\n\n---\n\n")}`;
}

/**
 * Build a complete augmented prompt with system instruction, context, and user query.
 */
export function buildAugmentedPrompt(
  userQuery: string,
  retrievedContext: string,
  taskInstruction: string
): string {
  return `${taskInstruction}

---

${retrievedContext}

---

USER INPUT:
${userQuery}

---

IMPORTANT: Base your response on the retrieved context above. If the context doesn't contain relevant information, say so rather than making things up. Always cite which source(s) informed your answer.`;
}

// ─── Exports ───────────────────────────────────────────────────

export { EMBEDDING_DIMENSIONS };
