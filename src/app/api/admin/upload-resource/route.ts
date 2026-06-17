import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { indexDocument } from "@/lib/rag";
import type { KBType } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // ─── Authorization check ───
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Create temporary Supabase client with candidate's JWT token
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: { user }, error: authError } = await client.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // Gating check on administrator email
    const adminEmail = process.env.ADMIN_EMAIL || "kalvaharshith@gmail.com";
    if (user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden - Admin privilege required" }, { status: 403 });
    }

    // ─── Process payload ───
    const body = await request.json();
    const { kbType, content, metadata } = body;

    if (!kbType || !content) {
      return NextResponse.json({ error: "Missing required fields (kbType or content)" }, { status: 400 });
    }

    // Validate kbType
    const validKbTypes: KBType[] = [
      "ats_rules",
      "resume_examples",
      "interview_bank",
      "company_profiles",
      "learning_resources",
    ];

    if (!validKbTypes.includes(kbType)) {
      return NextResponse.json({ error: `Invalid knowledge base segment: ${kbType}` }, { status: 400 });
    }

    // Index the resource (generates embedding + writes to supabase pgvector)
    await indexDocument(content, metadata || {}, kbType);

    return NextResponse.json({
      success: true,
      message: "Resource indexed successfully in the knowledge base.",
    });
  } catch (err: any) {
    console.error("Upload resource API error:", err);
    return NextResponse.json({ error: err.message || "Failed to upload resource" }, { status: 500 });
  }
}
