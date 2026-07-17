import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase";
import {
  FraudShield,
  getClientIP,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/fraud-shield";

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || undefined;

  // ── FraudShield: Rate limit admin endpoint (10/min) ──
  const rateCheck = FraudShield.checkRateLimit(
    `admin:stats:${ip}`,
    RATE_LIMITS.admin
  );
  if (!rateCheck.allowed) {
    FraudShield.logFraudEvent({
      eventType: "rate_limit",
      severity: "high",
      ipAddress: ip,
      userAgent,
      route: "/api/admin/stats",
      details: { hits: rateCheck.totalHits },
      actionTaken: "rate_limited",
      riskScore: 60,
    });
    return rateLimitResponse(rateCheck, "admin:stats");
  }

  try {
    // ─── Authorization check ───
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      // ── FraudShield: Log unauthorized access attempt ──
      FraudShield.logFraudEvent({
        eventType: "auth_abuse",
        severity: "medium",
        ipAddress: ip,
        userAgent,
        route: "/api/admin/stats",
        details: { reason: "Missing authorization header" },
        actionTaken: "blocked",
        riskScore: 40,
      });
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: authError } = await client.auth.getUser(token);
    if (authError || !user) {
      FraudShield.logFraudEvent({
        eventType: "auth_abuse",
        severity: "high",
        ipAddress: ip,
        userAgent,
        route: "/api/admin/stats",
        details: { reason: "Invalid auth token" },
        actionTaken: "blocked",
        riskScore: 70,
      });
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL || "kalvaharshith@gmail.com";
    if (user.email !== adminEmail) {
      // ── FraudShield: Log unauthorized admin access attempt ──
      FraudShield.logFraudEvent({
        eventType: "auth_abuse",
        severity: "critical",
        userId: user.id,
        ipAddress: ip,
        userAgent,
        route: "/api/admin/stats",
        details: {
          reason: "Non-admin user attempted admin access",
          attemptedEmail: user.email,
        },
        actionTaken: "blocked",
        riskScore: 85,
      });
      return NextResponse.json({ error: "Forbidden - Admin privilege required" }, { status: 403 });
    }

    // ── FraudShield: Optional IP whitelist for admin ──
    const adminIpWhitelist = process.env.ADMIN_IP_WHITELIST;
    if (adminIpWhitelist) {
      const allowedIps = adminIpWhitelist.split(",").map((s) => s.trim());
      if (!allowedIps.includes(ip) && ip !== "unknown") {
        FraudShield.logFraudEvent({
          eventType: "auth_abuse",
          severity: "critical",
          userId: user.id,
          ipAddress: ip,
          userAgent,
          route: "/api/admin/stats",
          details: { reason: "Admin access from non-whitelisted IP", ip },
          actionTaken: "blocked",
          riskScore: 90,
        });
        return NextResponse.json({ error: "Access denied from this IP" }, { status: 403 });
      }
    }

    const supabaseServer = createServerSupabase();

    // ─── Core Stats (parallel) ───
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

    // ─── Per-KB Type Breakdown (parallel) ───
    const kbTypes = ["interview_bank", "company_profiles", "ats_rules", "resume_examples", "learning_resources"] as const;
    const kbCountPromises = kbTypes.map(kbType =>
      supabaseServer
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("kb_type", kbType)
    );
    const kbCountResults = await Promise.all(kbCountPromises);

    const kbBreakdown: Record<string, number> = {};
    kbTypes.forEach((kbType, i) => {
      kbBreakdown[kbType] = kbCountResults[i].count || 0;
    });

    // ─── Recent Signups (last 5) ───
    const { data: recentUsers } = await supabaseServer
      .from("profiles")
      .select("id, name, college, tier, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    // ─── Recent Interviews (last 5) ───
    const { data: recentInterviews } = await supabaseServer
      .from("mock_interviews")
      .select("id, company, round, score, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(5);

    // ─── Premium User Count ───
    const { count: premiumCount } = await supabaseServer
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("tier", "premium");

    // ─── FraudShield Stats (recent fraud events) ───
    let fraudStats = null;
    try {
      const { count: totalFraudEvents } = await supabaseServer
        .from("fraud_events")
        .select("*", { count: "exact", head: true });

      const { count: criticalEvents } = await supabaseServer
        .from("fraud_events")
        .select("*", { count: "exact", head: true })
        .eq("severity", "critical");

      const { data: recentFraudEvents } = await supabaseServer
        .from("fraud_events")
        .select("id, event_type, severity, ip_address, route, action_taken, risk_score, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      fraudStats = {
        totalEvents: totalFraudEvents || 0,
        criticalEvents: criticalEvents || 0,
        recentEvents: recentFraudEvents || [],
      };
    } catch {
      // fraud_events table may not exist yet — skip
    }

    return NextResponse.json({
      success: true,
      stats: {
        users: profilesRes.count || 0,
        resumes: resumesRes.count || 0,
        interviews: interviewsRes.count || 0,
        documents: documentsRes.count || 0,
        premiumUsers: premiumCount || 0,
      },
      kbBreakdown,
      recentUsers: recentUsers || [],
      recentInterviews: recentInterviews || [],
      fraudStats,
    });
  } catch (err: any) {
    console.error("Admin stats API error:", err);
    return NextResponse.json({ error: err.message || "Failed to retrieve system stats" }, { status: 500 });
  }
}
