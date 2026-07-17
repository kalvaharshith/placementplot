import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai";
import { retrieveAndAugment } from "@/lib/rag";
import { buildRoadmapPrompt, buildSkillGapPrompt } from "@/features/roadmap/prompts";
import {
  FraudShield,
  getClientIP,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/fraud-shield";

// ─── Constants ─────────────────────────────────────────────────

const MAX_TARGET_COMPANIES = 5;
const MAX_COMPANY_NAME_LENGTH = 100;
const MAX_RESUME_TEXT_LENGTH = 50_000;

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || undefined;

  // ── FraudShield: Rate limit (3 roadmaps/30min per IP) ──
  const rateCheck = FraudShield.checkRateLimit(
    `roadmap:generate:${ip}`,
    RATE_LIMITS.roadmapGenerate
  );
  if (!rateCheck.allowed) {
    FraudShield.logFraudEvent({
      eventType: "rate_limit",
      severity: "medium",
      ipAddress: ip,
      userAgent,
      route: "/api/roadmap/generate",
      details: { hits: rateCheck.totalHits },
      actionTaken: "rate_limited",
      riskScore: 50,
    });
    return rateLimitResponse(rateCheck, "roadmap:generate");
  }

  try {
    const body = await request.json();
    const { skillLevel, availableHours, timelineMonths, targetCompanies, resumeText } = body;

    if (!targetCompanies || !Array.isArray(targetCompanies) || targetCompanies.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one target company." },
        { status: 400 }
      );
    }

    // ── FraudShield: Validate target companies array ──
    if (targetCompanies.length > MAX_TARGET_COMPANIES) {
      return NextResponse.json(
        { error: `Too many target companies (max ${MAX_TARGET_COMPANIES}).` },
        { status: 400 }
      );
    }

    for (const company of targetCompanies) {
      if (typeof company !== "string" || company.length > MAX_COMPANY_NAME_LENGTH) {
        return NextResponse.json(
          { error: "Invalid company name format." },
          { status: 400 }
        );
      }
    }

    // ── FraudShield: Validate resume text length if provided ──
    if (resumeText && resumeText.length > MAX_RESUME_TEXT_LENGTH) {
      return NextResponse.json(
        { error: "Resume text is too long. Please provide a shorter version." },
        { status: 400 }
      );
    }

    // ── FraudShield: AI abuse check on inputs ──
    const combinedInput = `${targetCompanies.join(" ")} ${skillLevel || ""} ${resumeText || ""}`;
    const abuseCheck = FraudShield.checkAIAbuse({
      ipAddress: ip,
      route: "/api/roadmap/generate",
      inputText: combinedInput,
      userAgent,
    });

    if (!abuseCheck.allowed) {
      FraudShield.logFraudEvent({
        eventType: "ai_abuse",
        severity: "high",
        ipAddress: ip,
        userAgent,
        route: "/api/roadmap/generate",
        details: {
          signals: abuseCheck.signals,
          targetCompanies,
        },
        actionTaken: "blocked",
        riskScore: abuseCheck.riskScore,
      });
      return NextResponse.json(
        { error: "Your request was flagged by our security system. Please try again with valid inputs." },
        { status: 403 }
      );
    }

    const userProfile = {
      skillLevel: skillLevel || "Intermediate",
      availableHours: availableHours || 15,
      timelineMonths: timelineMonths || 3,
      targetCompanies,
      strengths: [] as string[],
      weaknesses: [] as string[],
      resumeGaps: [] as string[],
    };

    // ── Optional Step: Skill Gap analysis if resume is provided ──
    let skillGapData = "";
    if (resumeText && resumeText.trim().length > 100) {
      try {
        let reqsContext = "Technical SDE skills, coding capabilities, and professional qualities required.";
        try {
          const { context } = await retrieveAndAugment(
            `${targetCompanies.join(" ")} SDE requirements skills expected`,
            "company_profiles",
            { topK: 2, minSimilarity: 0.25 }
          );
          if (context) reqsContext = context;
        } catch {}

        const skillGapPrompt = buildSkillGapPrompt(resumeText, reqsContext);
        const gapsResult = await generateJSON<{
          presentSkills?: string[];
          missingSkills?: string[];
          weakAreas?: string[];
          recommendations?: string[];
        }>(
          skillGapPrompt,
          "You are an expert technical recruiter and resume reviewer. Match resume skills against target expectations.",
          { temperature: 0.2 }
        );

        if (gapsResult.missingSkills) userProfile.resumeGaps = gapsResult.missingSkills.slice(0, 5);
        if (gapsResult.weakAreas) userProfile.weaknesses = gapsResult.weakAreas.slice(0, 5);
        if (gapsResult.presentSkills) userProfile.strengths = gapsResult.presentSkills.slice(0, 5);
        skillGapData = JSON.stringify(gapsResult);
      } catch (e) {
        console.warn("Skill gap analysis failed, continuing with regular generation:", e);
      }
    }

    // ── RAG: Retrieve company profiles (KB4) ──
    let companyPatterns = "Verify hiring process of: " + targetCompanies.join(", ");
    try {
      const { context } = await retrieveAndAugment(
        `${targetCompanies.join(" ")} hiring process interview rounds and criteria`,
        "company_profiles",
        { topK: 3, minSimilarity: 0.25 }
      );
      if (context) companyPatterns = context;
    } catch {}

    // ── RAG: Retrieve interview questions / topics (KB3) ──
    let topicsData = "Most-asked questions details for: " + targetCompanies.join(", ");
    try {
      const { context } = await retrieveAndAugment(
        `${targetCompanies.join(" ")} frequently asked coding interview questions`,
        "interview_bank",
        { topK: 4, minSimilarity: 0.3, maxChunkLength: 600 }
      );
      if (context) topicsData = context;
    } catch {}

    // ── RAG: Retrieve learning resources (KB5) ──
    let learningResources = "Available study links and tutorials.";
    try {
      const { context } = await retrieveAndAugment(
        `study guides practice courses for ${skillLevel} level`,
        "learning_resources",
        { topK: 3, minSimilarity: 0.2 }
      );
      if (context) learningResources = context;
    } catch {}

    // ── Generate customized roadmap ──
    const prompt = buildRoadmapPrompt(
      userProfile,
      companyPatterns,
      topicsData,
      learningResources
    );

    const roadmap = await generateJSON<any>(
      prompt,
      "You are an expert career counselor and academic planner. Design structured, realistic weekly plans.",
      { temperature: 0.5 }
    );

    return NextResponse.json({
      success: true,
      roadmap,
      skillGap: skillGapData ? JSON.parse(skillGapData) : null,
    });
  } catch (error: any) {
    console.error("Roadmap generation error:", error);

    // Fallback directly to AI without RAG if keys are configured
    try {
      if (process.env.GEMINI_API_KEY) {
        const body = await request.clone().json();
        const { targetCompanies } = body;
        const fallbackPrompt = `Create a generic week-by-week study plan for matching criteria of: ${targetCompanies?.join(", ") || "SDE positions"}`;
        
        const roadmap = await generateJSON<any>(
          fallbackPrompt + "\nFormat as: {title, totalWeeks, weeks: [{week, theme, goals: [], tasks: [{title, description, type, estimatedHours, resources: [], relevantCompanies: [], priority}], milestone}], tips: [], summary}",
          "You are an expert counselor. Output JSON."
        );
        return NextResponse.json({
          success: true,
          roadmap,
          warning: "Generated without RAG knowledge base",
        });
      }
    } catch (fallbackError: any) {
      console.error("Roadmap fallback failed:", fallbackError);
    }

    const msg = error.message?.includes("API key") || error.message?.includes("401")
      ? "AI service authentication failed. Please check the Gemini API key."
      : error.message?.includes("quota") || error.message?.includes("429")
      ? "AI service rate limit reached. Please try again in a minute."
      : "Failed to generate roadmap. The AI service may be temporarily unavailable.";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
