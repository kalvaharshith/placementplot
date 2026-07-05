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

// ─── GET /api/admin/users ───
// List all users with pagination, search, and tier filter
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const tier = searchParams.get("tier") || "all";

    const supabase = createServerSupabase();
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("profiles")
      .select("id, name, avatar_url, college, year, branch, tier, resume_credits, interview_credits, created_at, updated_at", { count: "exact" });

    // Apply tier filter
    if (tier !== "all") {
      query = query.eq("tier", tier);
    }

    // Apply search filter (name or college)
    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,college.ilike.%${search}%`);
    }

    // Apply pagination and ordering
    const { data: users, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    // For each user, get their resume count and interview count (batch)
    const userIds = (users || []).map(u => u.id);

    let userStats: Record<string, { resumes: number; interviews: number }> = {};

    if (userIds.length > 0) {
      // Get resume counts
      const { data: resumeCounts } = await supabase
        .from("resumes")
        .select("user_id")
        .in("user_id", userIds);

      // Get interview counts
      const { data: interviewCounts } = await supabase
        .from("mock_interviews")
        .select("user_id")
        .in("user_id", userIds);

      // Tally
      userIds.forEach(uid => {
        userStats[uid] = {
          resumes: (resumeCounts || []).filter(r => r.user_id === uid).length,
          interviews: (interviewCounts || []).filter(i => i.user_id === uid).length,
        };
      });
    }

    const enrichedUsers = (users || []).map(u => ({
      ...u,
      resumeCount: userStats[u.id]?.resumes || 0,
      interviewCount: userStats[u.id]?.interviews || 0,
    }));

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err: any) {
    console.error("Admin users list API error:", err);
    return NextResponse.json({ error: err.message || "Failed to list users" }, { status: 500 });
  }
}
