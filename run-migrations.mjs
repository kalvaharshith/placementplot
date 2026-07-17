/**
 * PlacementPlot — Run SQL Migrations via Supabase Management API
 * Usage: node run-migrations.mjs
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env.local ──────────────────────────────────────
function loadEnv() {
  const envPath = resolve(__dirname, ".env.local");
  if (!existsSync(envPath)) {
    console.error("❌ .env.local not found");
    process.exit(1);
  }
  const env = {};
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY");
  process.exit(1);
}

// ─── Execute SQL via Supabase REST API ────────────────────
async function executeSQLStatements(statements, label) {
  console.log(`\n📋 Running: ${label}`);
  
  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i].trim();
    if (!sql || sql.startsWith("--")) continue;
    
    const preview = sql.substring(0, 80).replace(/\n/g, " ");
    process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}... `);
    
    try {
      // Use the Supabase PostgREST RPC or direct query endpoint
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
        method: "POST",
        headers: {
          "apikey": SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      });
      
      if (res.ok) {
        console.log("✅");
      } else {
        const body = await res.text();
        // 404 means the RPC endpoint doesn't exist — expected for DDL
        if (res.status === 404) {
          console.log("⚠️  (RPC not available)");
          return false; // Signal to try alternative approach
        }
        console.log(`❌ HTTP ${res.status}: ${body.substring(0, 200)}`);
      }
    } catch (err) {
      console.log(`❌ ${err.message}`);
    }
  }
  return true;
}

// ─── Split SQL into statements ──────────────────────────────
function splitSQL(sql) {
  // Remove comments and split by semicolons
  return sql
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.match(/^--/));
}

// ─── Alternative: Try creating tables via REST API check ────
async function checkTableExists(tableName) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=id&limit=1`, {
      headers: {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    return res.status === 200 || res.status === 206;
  } catch {
    return false;
  }
}

// ─── Combined SQL for both migrations ───────────────────────
const COMBINED_SQL = `
-- Migration 002: Fraud Events Table
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

-- Migration 003: User Documents Table
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

CREATE POLICY "Users can view own documents" ON user_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON user_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON user_documents
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS documents_metadata_user_idx
  ON documents USING gin ((metadata->'user_id'));
`;

// ─── Main ───────────────────────────────────────────────────
async function main() {
  console.log("🚀 PlacementPlot — Migration Runner");
  console.log("====================================");
  console.log(`📡 Supabase: ${SUPABASE_URL}`);

  // Check if tables already exist
  console.log("\n🔍 Checking existing tables...");
  
  const fraudExists = await checkTableExists("fraud_events");
  const docsExists = await checkTableExists("user_documents");
  
  console.log(`  fraud_events: ${fraudExists ? "✅ exists" : "❌ not found"}`);
  console.log(`  user_documents: ${docsExists ? "✅ exists" : "❌ not found"}`);

  if (fraudExists && docsExists) {
    console.log("\n✅ Both tables already exist! No migration needed.");
    return;
  }

  // Try RPC approach first
  const statements = splitSQL(COMBINED_SQL);
  const rpcWorked = await executeSQLStatements(statements, "Combined Migrations");

  if (!rpcWorked) {
    console.log("\n⚠️  Direct SQL execution via REST API is not available.");
    console.log("   This is normal — Supabase requires the SQL Editor or CLI for DDL.");
    console.log("\n📋 MANUAL STEP REQUIRED:");
    console.log("   1. Go to: https://supabase.com/dashboard/project/mixoqvqwgyphubaktpwr/sql/new");
    console.log("   2. Log in if needed");
    console.log("   3. Paste the contents of these files and click Run:");
    console.log("      • supabase/migrations/002_fraud_events.sql");
    console.log("      • supabase/migrations/003_user_documents.sql");
    console.log("\n   Or paste this combined SQL:\n");
    console.log(COMBINED_SQL);
  }

  // Re-check after migration attempt
  console.log("\n🔍 Re-checking tables...");
  const fraudNow = await checkTableExists("fraud_events");
  const docsNow = await checkTableExists("user_documents");
  
  console.log(`  fraud_events: ${fraudNow ? "✅ exists" : "❌ not found"}`);
  console.log(`  user_documents: ${docsNow ? "✅ exists" : "❌ not found"}`);

  if (fraudNow && docsNow) {
    console.log("\n🎉 All migrations applied successfully!");
  }
}

main().catch(console.error);
