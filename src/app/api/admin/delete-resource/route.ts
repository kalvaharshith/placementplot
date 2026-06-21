import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase";

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

    // Create temporary Supabase client with JWT token to verify session
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

    // ─── Process delete payload ───
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing required parameter: id" }, { status: 400 });
    }

    // Connect to database with service role bypass client
    const supabaseServer = createServerSupabase();
    const { error: deleteError } = await supabaseServer
      .from("documents")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return NextResponse.json({
      success: true,
      message: "Resource deleted successfully from the knowledge base.",
    });
  } catch (err: any) {
    console.error("Delete resource API error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete resource" }, { status: 500 });
  }
}
