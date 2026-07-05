import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase";

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

// ─── GET /api/admin/content ───
// Browse all RAG documents with pagination, filter by kb_type, search
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const kbType = searchParams.get("kb_type") || "all";
    const search = searchParams.get("search") || "";

    const supabase = createServerSupabase();
    const offset = (page - 1) * limit;

    let query = supabase
      .from("documents")
      .select("id, content, metadata, kb_type, created_at", { count: "exact" });

    // Filter by kb_type
    if (kbType !== "all") {
      query = query.eq("kb_type", kbType);
    }

    // Search in content
    if (search.trim()) {
      query = query.ilike("content", `%${search}%`);
    }

    const { data: documents, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    return NextResponse.json({
      success: true,
      documents: documents || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err: any) {
    console.error("Admin content list API error:", err);
    return NextResponse.json({ error: err.message || "Failed to list content" }, { status: 500 });
  }
}
