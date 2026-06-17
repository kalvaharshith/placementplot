import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, type KBType } from "@/lib/supabase";
import { embedBatch } from "@/lib/embeddings";
import path from "path";
import fs from "fs/promises";

// ─── POST /api/seed ─────────────────────────────────────────────
// Reads seed JSON files, generates embeddings, and inserts them into Supabase.

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase();

    // 1. Define Knowledge Bases to seed
    const kbs: { type: KBType; filename: string }[] = [
      { type: "ats_rules", filename: "ats-rules.json" },
      { type: "resume_examples", filename: "resume-examples.json" },
      { type: "interview_bank", filename: "interview-bank.json" },
      { type: "company_profiles", filename: "company-profiles.json" },
      { type: "learning_resources", filename: "learning-resources.json" },
    ];

    let totalIndexed = 0;
    const details: Record<string, number> = {};

    // 2. Process each KB
    for (const kb of kbs) {
      const filepath = path.join(process.cwd(), "src", "data", kb.filename);
      
      // Read file
      let fileContent: string;
      try {
        fileContent = await fs.readFile(filepath, "utf8");
      } catch (err) {
        console.warn(`Seed file not found: ${kb.filename}, skipping.`);
        continue;
      }

      const items = JSON.parse(fileContent);
      if (!Array.isArray(items) || items.length === 0) {
        continue;
      }

      // Extract texts to embed
      const texts = items.map((item: any) => item.content);
      
      console.log(`Generating embeddings for ${kb.type} (${items.length} items)...`);
      const embeddings = await embedBatch(texts);

      // Construct DB rows
      const rows = items.map((item: any, idx: number) => ({
        content: item.content,
        embedding: embeddings[idx],
        metadata: item.metadata || {},
        kb_type: kb.type,
      }));

      // Delete existing documents of this type to avoid duplicates
      const { error: deleteError } = await supabase
        .from("documents")
        .delete()
        .eq("kb_type", kb.type);

      if (deleteError) {
        throw new Error(`Failed to clean existing documents for ${kb.type}: ${deleteError.message}`);
      }

      // Bulk insert rows
      const { error: insertError } = await supabase
        .from("documents")
        .insert(rows);

      if (insertError) {
        throw new Error(`Failed to insert seed documents for ${kb.type}: ${insertError.message}`);
      }

      details[kb.type] = rows.length;
      totalIndexed += rows.length;
    }

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
      totalIndexed,
      details,
    });
  } catch (error: any) {
    console.error("Seeding error:", error);
    return NextResponse.json(
      { error: "Failed to seed database", details: error.message },
      { status: 500 }
    );
  }
}

// Allow GET request for easy manual seeding in browser during development
export async function GET(request: NextRequest) {
  return POST(request);
}
