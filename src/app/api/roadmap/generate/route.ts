import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai";
import { retrieveAndAugment } from "@/lib/rag";
import { buildRoadmapPrompt, buildSkillGapPrompt } from "@/features/roadmap/prompts";

// ─── Default Static Roadmap Fallback (if AI fails entirely) ─────
const mockRoadmap = {
  title: "TCS & Infosys Prep Plan",
  totalWeeks: 4,
  weeks: [
    {
      week: 1,
      theme: "Foundations & Aptitude",
      goals: ["Master arrays & strings fundamentals", "Practice basic quantitative aptitude"],
      tasks: [
        {
          title: "Complete arrays & strings fundamentals",
          description: "Solve easy-medium problems on reverse array, search, and string parsing.",
          type: "practice",
          estimatedHours: 4,
          resources: [
            { title: "GeeksforGeeks Arrays", url: "https://www.geeksforgeeks.org/array-data-structure/", type: "article" }
          ],
          relevantCompanies: ["TCS", "Infosys"],
          priority: "high"
        },
        {
          title: "Aptitude (Quantitative)",
          description: "Learn time & work, ratios, and percentages formula.",
          type: "study",
          estimatedHours: 3,
          resources: [
            { title: "IndiaBIX Quantitative", url: "https://www.indiabix.com/", type: "problem_set" }
          ],
          relevantCompanies: ["TCS"],
          priority: "high"
        }
      ],
      milestone: "Able to write basic array operations and pass basic TCS NQT quantitative sections"
    },
    {
      week: 2,
      theme: "OOPs and Database Basics",
      goals: ["Revise OOP principles", "Learn basic SQL queries"],
      tasks: [
        {
          title: "Object-Oriented Programming (OOPs)",
          description: "Understand classes, objects, inheritance, polymorphism, encapsulation, and abstraction.",
          type: "study",
          estimatedHours: 4,
          resources: [
            { title: "Java OOPs Concepts", url: "https://www.geeksforgeeks.org/object-oriented-programming-oops-concept-in-java/", type: "article" }
          ],
          relevantCompanies: ["Infosys", "Wipro"],
          priority: "medium"
        },
        {
          title: "SQL Query Practice",
          description: "Practice SELECT, WHERE, JOINs, and basic aggregation queries.",
          type: "practice",
          estimatedHours: 3,
          resources: [
            { title: "LeetCode SQL 50", url: "https://leetcode.com/studyplan/30-days-of-dsa/", type: "problem_set" }
          ],
          relevantCompanies: ["Infosys"],
          priority: "high"
        }
      ],
      milestone: "Able to define core OOP paradigms and compose standard JOIN queries"
    }
  ],
  tips: ["Practice coding under timed constraints.", "Revise quantitative formulas daily."],
  summary: "A focused study plan curated to match the technical testing criteria of TCS and Infosys."
};

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
            { topK: 3 }
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
        { topK: 4 }
      );
      if (context) companyPatterns = context;
    } catch {}

    // ── RAG: Retrieve interview questions / topics (KB3) ──
    let topicsData = "Most-asked questions details for: " + targetCompanies.join(", ");
    try {
      const { context } = await retrieveAndAugment(
        `${targetCompanies.join(" ")} frequently asked coding interview questions`,
        "interview_bank",
        { topK: 5 }
      );
      if (context) topicsData = context;
    } catch {}

    // ── RAG: Retrieve learning resources (KB5) ──
    let learningResources = "Available study links and tutorials.";
    try {
      const { context } = await retrieveAndAugment(
        `study guides practice courses for ${skillLevel} level`,
        "learning_resources",
        { topK: 5 }
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

    // Fallback directly to AI without RAG if keys are configured, or fallback to mock template
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
    } catch (fallbackError) {
      console.error("Roadmap fallback failed:", fallbackError);
    }

    return NextResponse.json({
      success: true,
      roadmap: mockRoadmap,
      warning: "Service unavailable — using mock local roadmap data",
    });
  }
}
