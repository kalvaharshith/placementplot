import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─── POST /api/migrate ─────────────────────────────────────
// Runs all pending migrations using the service role client.
// This is idempotent — safe to run multiple times.

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase credentials" },
        { status: 500 }
      );
    }

    // Use service role for DDL operations
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const results: { step: string; status: string; error?: string }[] = [];

    // ─── Migration 002: fraud_events table ──────────────────
    // Check if table exists first by attempting a select
    const { error: fraudCheck } = await supabase
      .from("fraud_events")
      .select("id")
      .limit(1);

    if (fraudCheck && fraudCheck.message?.includes("does not exist")) {
      // Table doesn't exist — create it via RPC
      // We'll try creating a temporary function to execute DDL
      const { error: createFraudErr } = await supabase.rpc("exec_sql", {
        sql_query: `
          CREATE TABLE IF NOT EXISTS fraud_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_type TEXT NOT NULL,
            severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
            user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
            ip_address TEXT,
            user_agent TEXT,
            route TEXT,
            details JSONB DEFAULT '{}',
            action_taken TEXT NOT NULL DEFAULT 'logged' CHECK (action_taken IN ('blocked', 'warned', 'logged', 'rate_limited')),
            risk_score INT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS fraud_events_type_idx ON fraud_events (event_type);
          CREATE INDEX IF NOT EXISTS fraud_events_severity_idx ON fraud_events (severity);
          CREATE INDEX IF NOT EXISTS fraud_events_user_idx ON fraud_events (user_id);
          CREATE INDEX IF NOT EXISTS fraud_events_ip_idx ON fraud_events (ip_address);
          CREATE INDEX IF NOT EXISTS fraud_events_created_idx ON fraud_events (created_at DESC);
          CREATE INDEX IF NOT EXISTS fraud_events_type_severity_idx ON fraud_events (event_type, severity, created_at DESC);
          ALTER TABLE fraud_events ENABLE ROW LEVEL SECURITY;
        `,
      });

      if (createFraudErr) {
        results.push({
          step: "fraud_events table (via exec_sql RPC)",
          status: "failed",
          error: createFraudErr.message,
        });
      } else {
        results.push({ step: "fraud_events table", status: "created" });
      }
    } else {
      results.push({ step: "fraud_events table", status: "already exists" });
    }

    // ─── Migration 003: user_documents table ────────────────
    const { error: docsCheck } = await supabase
      .from("user_documents")
      .select("id")
      .limit(1);

    if (docsCheck && docsCheck.message?.includes("does not exist")) {
      const { error: createDocsErr } = await supabase.rpc("exec_sql", {
        sql_query: `
          CREATE TABLE IF NOT EXISTS user_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            file_name TEXT NOT NULL,
            original_size_bytes INT,
            chunk_count INT DEFAULT 0,
            pii_types_found TEXT[] DEFAULT '{}',
            pii_redaction_count INT DEFAULT 0,
            status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'indexed', 'failed')),
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS user_documents_user_idx ON user_documents (user_id);
          CREATE INDEX IF NOT EXISTS user_documents_status_idx ON user_documents (status);
          CREATE INDEX IF NOT EXISTS user_documents_created_idx ON user_documents (created_at DESC);
          ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;
          CREATE POLICY "Users can view own documents" ON user_documents FOR SELECT USING (auth.uid() = user_id);
          CREATE POLICY "Users can insert own documents" ON user_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
          CREATE POLICY "Users can delete own documents" ON user_documents FOR DELETE USING (auth.uid() = user_id);
        `,
      });

      if (createDocsErr) {
        results.push({
          step: "user_documents table (via exec_sql RPC)",
          status: "failed",
          error: createDocsErr.message,
        });
      } else {
        results.push({ step: "user_documents table", status: "created" });
      }
    } else {
      results.push({ step: "user_documents table", status: "already exists" });
    }

    // Check if any steps failed
    const hasFails = results.some((r) => r.status === "failed");

    // If RPC exec_sql doesn't exist, provide manual SQL
    if (hasFails) {
      const needsManualSQL = results.some(
        (r) => r.error?.includes("function") || r.error?.includes("exec_sql")
      );

      if (needsManualSQL) {
        return NextResponse.json({
          success: false,
          message:
            "The exec_sql RPC function doesn't exist yet. You need to first create it in the Supabase SQL editor, then run this endpoint again.",
          setupSQL: `-- Run this ONCE in Supabase SQL Editor to enable programmatic migrations:
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;`,
          results,
        });
      }
    }

    return NextResponse.json({
      success: !hasFails,
      message: hasFails
        ? "Some migrations failed — see results."
        : "All migrations applied successfully!",
      results,
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: error.message || "Migration failed" },
      { status: 500 }
    );
  }
}

// Allow GET for easy browser access
export async function GET(request: NextRequest) {
  return POST(request);
}
