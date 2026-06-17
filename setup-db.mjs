/**
 * PlacementPlot AI — Database Setup Script
 * 
 * This script connects to Supabase via the REST API and sets up
 * the database schema + seeds the knowledge base.
 * 
 * Usage: node setup-db.mjs
 * 
 * Prerequisites:
 *   - Fill in SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY below
 *   - Or set them in your .env.local
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env.local manually ───────────────────────────────────
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
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    env[key] = val;
  }
  return env;
}

const env = loadEnv();

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  console.error("   Please add your API keys first (see instructions above)");
  process.exit(1);
}

const headers = {
  "apikey": SERVICE_ROLE_KEY,
  "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=minimal",
};

async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: sql }),
  });
  // Supabase doesn't expose a direct SQL exec via REST — use the pg endpoint
  // We'll use the Management API instead
  return res;
}

async function checkConnection() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/documents?select=id&limit=1`, {
    headers,
  });
  if (res.status === 200 || res.status === 206) {
    return { ok: true, message: "documents table exists ✓" };
  }
  if (res.status === 404 || res.status === 400) {
    const body = await res.json();
    if (body?.message?.includes("relation") || body?.code === "42P01") {
      return { ok: false, message: "Schema not yet applied" };
    }
  }
  return { ok: false, message: `HTTP ${res.status}: ${await res.text()}` };
}

async function seedKnowledgeBase() {
  const dataDir = resolve(__dirname, "src", "data");
  
  const knowledgeBases = [
    { type: "ats_rules", file: "ats-rules.json" },
    { type: "resume_examples", file: "resume-examples.json" },
    { type: "interview_bank", file: "interview-bank.json" },
    { type: "company_profiles", file: "company-profiles.json" },
    { type: "learning_resources", file: "learning-resources.json" },
  ];

  console.log("\n📚 Seeding knowledge base via /api/seed...");
  
  const res = await fetch("http://localhost:3000/api/seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  
  const data = await res.json();
  
  if (res.ok && data.success) {
    console.log("✅ Knowledge base seeded successfully!");
    console.log(`   Total documents indexed: ${data.totalIndexed}`);
    for (const [kb, count] of Object.entries(data.details || {})) {
      console.log(`   • ${kb}: ${count} documents`);
    }
  } else {
    console.error("❌ Seeding failed:", data.error || data.details);
    console.error("   Make sure the dev server is running (npm run dev)");
    console.error("   And that GEMINI_API_KEY is set in .env.local");
  }
}

async function main() {
  console.log("🚀 PlacementPlot AI — Database Setup");
  console.log("=====================================");
  console.log(`📡 Supabase URL: ${SUPABASE_URL}`);
  console.log("");

  // Check connection
  console.log("🔍 Checking database connection...");
  const check = await checkConnection();
  
  if (check.ok) {
    console.log(`✅ Connected! ${check.message}`);
    
    // Offer to seed
    console.log("\n📋 Schema is already applied.");
    await seedKnowledgeBase();
  } else {
    console.log(`⚠️  ${check.message}`);
    console.log("\n📋 MANUAL STEP REQUIRED:");
    console.log("   1. Go to: https://supabase.com/dashboard/project/mixoqvqwgyphubaktpwr/sql");
    console.log("   2. Open the SQL editor");
    console.log("   3. Paste & run the contents of: supabase/migrations/001_vector_tables.sql");
    console.log("   4. Run this script again to seed the knowledge base");
  }
}

main().catch(console.error);
