import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// ─── Client-side Supabase (browser) ─────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// ─── Server-side Supabase (API routes / server components) ──────
// Uses the service role key which bypasses Row Level Security.
// NEVER expose this to the client.
export function createServerSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ─── Types ──────────────────────────────────────────────────────

export type KBType =
  | "ats_rules"
  | "resume_examples"
  | "interview_bank"
  | "company_profiles"
  | "learning_resources";

export interface DocumentRow {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  kb_type: KBType;
  created_at: string;
}

export interface MatchDocumentResult {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}
