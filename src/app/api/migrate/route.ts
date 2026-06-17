import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// ─── GET /api/migrate ───────────────────────────────────────────
// One-time migration to fix vector dimensions from 768 → 3072
// for gemini-embedding-001 compatibility.

export async function GET() {
  try {
    const supabase = createServerSupabase();

    const statements = [
      // Drop old index
      `DROP INDEX IF EXISTS documents_embedding_idx`,
      // Alter column type
      `ALTER TABLE documents ALTER COLUMN embedding TYPE vector(3072) USING embedding::vector(3072)`,
      // Recreate HNSW index
      `CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING hnsw (embedding vector_cosine_ops)`,
    ];

    const results: { sql: string; status: string }[] = [];

    for (const sql of statements) {
      const { error } = await supabase.rpc("exec_sql", { sql_query: sql });
      if (error) {
        // Try via raw query if RPC doesn't exist
        results.push({ sql: sql.substring(0, 60), status: `rpc_error: ${error.message}` });
      } else {
        results.push({ sql: sql.substring(0, 60), status: "ok" });
      }
    }

    // Also recreate the match_documents and vector_search functions
    // via individual RPC calls
    const matchDocsFn = `
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(3072),
  query_text TEXT,
  filter_kb_type TEXT,
  filter_metadata JSONB DEFAULT '{}',
  match_count INT DEFAULT 5,
  vector_weight FLOAT DEFAULT 0.7,
  text_weight FLOAT DEFAULT 0.3
)
RETURNS TABLE (id UUID, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT d.id, d.content, d.metadata,
      1 - (d.embedding <=> query_embedding) AS vec_similarity
    FROM documents d
    WHERE d.kb_type = filter_kb_type
      AND (filter_metadata = '{}'::JSONB OR d.metadata @> filter_metadata)
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  text_results AS (
    SELECT d.id, d.content, d.metadata,
      ts_rank(d.fts, plainto_tsquery('english', query_text)) AS text_rank
    FROM documents d
    WHERE d.kb_type = filter_kb_type
      AND d.fts @@ plainto_tsquery('english', query_text)
      AND (filter_metadata = '{}'::JSONB OR d.metadata @> filter_metadata)
    ORDER BY text_rank DESC
    LIMIT match_count * 2
  ),
  combined AS (
    SELECT COALESCE(v.id, t.id) AS id,
      COALESCE(v.content, t.content) AS content,
      COALESCE(v.metadata, t.metadata) AS metadata,
      (COALESCE(v.vec_similarity, 0) * vector_weight +
       COALESCE(t.text_rank, 0) * text_weight) AS combined_score
    FROM vector_results v FULL OUTER JOIN text_results t ON v.id = t.id
  )
  SELECT combined.id, combined.content, combined.metadata,
    combined.combined_score AS similarity
  FROM combined ORDER BY combined_score DESC LIMIT match_count;
END; $$;
    `;

    const vectorSearchFn = `
CREATE OR REPLACE FUNCTION vector_search(
  query_embedding vector(3072),
  filter_kb_type TEXT,
  match_count INT DEFAULT 5
)
RETURNS TABLE (id UUID, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.content, d.metadata,
    (1 - (d.embedding <=> query_embedding))::FLOAT AS similarity
  FROM documents d
  WHERE d.kb_type = filter_kb_type
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END; $$;
    `;

    // Try to execute function updates via RPC
    for (const fn of [matchDocsFn, vectorSearchFn]) {
      const { error } = await supabase.rpc("exec_sql", { sql_query: fn });
      if (error) {
        results.push({ sql: fn.substring(0, 60).trim(), status: `rpc_error: ${error.message}` });
      } else {
        results.push({ sql: fn.substring(0, 60).trim(), status: "ok" });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Migration failed", details: error.message },
      { status: 500 }
    );
  }
}
