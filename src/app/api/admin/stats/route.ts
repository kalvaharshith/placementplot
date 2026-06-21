import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
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

    // Connect to database with service role bypass client
    const supabaseServer = createServerSupabase();

    // Query exact counts in parallel using head: true configuration for speed
    const [profilesRes, resumesRes, interviewsRes, documentsRes] = await Promise.all([
      supabaseServer.from("profiles").select("*", { count: "exact", head: true }),
      supabaseServer.from("resumes").select("*", { count: "exact", head: true }),
      supabaseServer.from("mock_interviews").select("*", { count: "exact", head: true }),
      supabaseServer.from("documents").select("*", { count: "exact", head: true }),
    ]);

    if (profilesRes.error) throw new Error(profilesRes.error.message);
    if (resumesRes.error) throw new Error(resumesRes.error.message);
    if (interviewsRes.error) throw new Error(interviewsRes.error.message);
    if (documentsRes.error) throw new Error(documentsRes.error.message);

    return NextResponse.json({
      success: true,
      stats: {
        users: profilesRes.count || 0,
        resumes: resumesRes.count || 0,
        interviews: interviewsRes.count || 0,
        documents: documentsRes.count || 0,
      },
    });
  } catch (err: any) {
    console.error("Admin stats API error:", err);
    return NextResponse.json({ error: err.message || "Failed to retrieve system stats" }, { status: 500 });
  }
}
