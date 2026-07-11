import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai";
import { retrieveAndAugment } from "@/lib/rag";
import { buildRoadmapPrompt, buildSkillGapPrompt } from "@/features/roadmap/prompts";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { skillLevel, availableHours, timelineMonths, targetCompanies, resumeText } = body;

    if (!targetCompanies || !Array.isArray(targetCompanies) || targetCompanies.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one target company." },
        { status: 400 }
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
