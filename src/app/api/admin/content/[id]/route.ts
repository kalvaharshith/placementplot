import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase";
import { embedText } from "@/lib/embeddings";

// ─── Helper: verify admin ───
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;

  const adminEmail = process.env.ADMIN_EMAIL || "kalvaharshith@gmail.com";
  if (user.email !== adminEmail) return null;

  return user;
}

// ─── PATCH /api/admin/content/[id] ───
// Edit content and metadata of an existing document (re-generates embedding)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { content, metadata } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Re-generate embedding for updated content
    const embedding = await embedText(content);

    // Build update
    const updates: Record<string, any> = {
      content,
      embedding,
    };

    if (metadata !== undefined) {
      updates.metadata = metadata;
    }

    const { data, error } = await supabase
      .from("documents")
      .update(updates)
      .eq("id", id)
      .select("id, content, metadata, kb_type, created_at")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      success: true,
      message: "Document updated and re-embedded successfully.",
      document: data,
    });
  } catch (err: any) {
    console.error("Admin content edit API error:", err);
    return NextResponse.json({ error: err.message || "Failed to update document" }, { status: 500 });
  }
}
