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

// ─── GET /api/admin/users/[id] ───
// Get detailed user info + activity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServerSupabase();

    // Fetch profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch user's resumes
    const { data: resumes } = await supabase
      .from("resumes")
      .select("id, file_name, ats_score, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch user's interviews
    const { data: interviews } = await supabase
      .from("mock_interviews")
      .select("id, company, role, round, difficulty, score, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch user's roadmap
    const { data: roadmapData } = await supabase
      .from("roadmap_plans")
      .select("id, target_companies, skill_level, progress, updated_at")
      .eq("user_id", id)
      .order("updated_at", { ascending: false })
      .limit(1);

    return NextResponse.json({
      success: true,
      profile,
      activity: {
        resumes: resumes || [],
        interviews: interviews || [],
        roadmap: roadmapData?.[0] || null,
      },
    });
  } catch (err: any) {
    console.error("Admin user detail API error:", err);
    return NextResponse.json({ error: err.message || "Failed to get user details" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/users/[id] ───
// Update user tier, credits, name
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
    const { tier, resume_credits, interview_credits, name } = body;

    const supabase = createServerSupabase();

    // Build update object with only provided fields
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (tier !== undefined) updates.tier = tier;
    if (resume_credits !== undefined) updates.resume_credits = resume_credits;
    if (interview_credits !== undefined) updates.interview_credits = interview_credits;
    if (name !== undefined) updates.name = name;

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      success: true,
      message: "User profile updated successfully.",
      profile: data,
    });
  } catch (err: any) {
    console.error("Admin user update API error:", err);
    return NextResponse.json({ error: err.message || "Failed to update user" }, { status: 500 });
  }
}
