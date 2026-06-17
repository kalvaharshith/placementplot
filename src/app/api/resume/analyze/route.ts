import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai";
import { retrieveAndAugment, buildAugmentedPrompt } from "@/lib/rag";
import {
  RESUME_ANALYSIS_SYSTEM,
  buildResumeAnalysisPrompt,
} from "@/features/resume/prompts";

import { extractText, getDocumentProxy } from "unpdf";

// ─── Types ─────────────────────────────────────────────────────

interface ResumeAnalysisResult {
  overallScore: number;
  scores: {
    formatting: { score: number; feedback: string };
    keywords: { score: number; feedback: string; missing: string[] };
    structure: { score: number; feedback: string };
    impact: { score: number; feedback: string };
    consistency: { score: number; feedback: string };
    relevance: { score: number; feedback: string };
  };
  suggestions: {
    priority: "high" | "medium" | "low";
    category: string;
    issue: string;
    suggestion: string;
    example: string;
  }[];
  strengths: string[];
  summary: string;
}

// ─── POST /api/resume/analyze ──────────────────────────────────

export async function POST(request: NextRequest) {
  let resumeText = "";
  let jobDescription: string | undefined = undefined;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    resumeText = formData.get("resumeText") as string;
    jobDescription = (formData.get("jobDescription") as string) || undefined;

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uint8Array = new Uint8Array(buffer);
      const pdf = await getDocumentProxy(uint8Array);
      const { text } = await extractText(pdf, { mergePages: true });
      resumeText = text;
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: "Resume text/file is too short. Please provide at least 50 characters or a valid PDF." },
        { status: 400 }
      );
    }

    // ── RAG Step 1: Retrieve ATS rules from KB1 ──
    const { context: atsRulesContext } = await retrieveAndAugment(
      "ATS resume scoring rules formatting keywords structure",
      "ats_rules",
      { topK: 5, contextHeader: "ATS RULES AND BEST PRACTICES:" }
    );

    // ── RAG Step 2: Retrieve similar high-scoring resume examples from KB2 ──
    const { context: examplesContext } = await retrieveAndAugment(
      resumeText.substring(0, 500), // Use beginning of resume to find similar examples
      "resume_examples",
      { topK: 5, contextHeader: "HIGH-SCORING RESUME EXAMPLES FOR REFERENCE:" }
    );

    // ── RAG Step 3: If JD provided, find matching keywords ──
    let jdContext = "";
    if (jobDescription) {
      const { context } = await retrieveAndAugment(
        jobDescription,
        "ats_rules",
        { topK: 3, contextHeader: "RELEVANT ATS RULES FOR THIS JOB DESCRIPTION:" }
      );
      jdContext = context;
    }

    // ── Build augmented prompt ──
    const combinedContext = [atsRulesContext, examplesContext, jdContext]
      .filter(Boolean)
      .join("\n\n---\n\n");

    const prompt = buildResumeAnalysisPrompt(
      resumeText,
      combinedContext,
      jobDescription
    );

    // ── Generate analysis ──
    const analysis = await generateJSON<ResumeAnalysisResult>(
      prompt,
      RESUME_ANALYSIS_SYSTEM,
      { temperature: 0.3, maxOutputTokens: 4096 }
    );

    // ── Clamp scores ──
    analysis.overallScore = Math.max(0, Math.min(100, analysis.overallScore));
    Object.values(analysis.scores).forEach((s) => {
      s.score = Math.max(0, Math.min(100, s.score));
    });

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Resume analysis error:", error);

    // Fallback: generate without RAG if knowledge base isn't set up yet or fails
    try {
      if (!resumeText || resumeText.trim().length < 50) {
        return NextResponse.json(
          { error: "Resume text/file is too short or invalid. Please provide at least 50 characters or a valid PDF." },
          { status: 400 }
        );
      }

      const prompt = buildResumeAnalysisPrompt(
        resumeText,
        "No knowledge base context available — analyze based on general ATS best practices.",
        jobDescription
      );

      const analysis = await generateJSON<ResumeAnalysisResult>(
        prompt,
        RESUME_ANALYSIS_SYSTEM,
        { temperature: 0.3 }
      );

      return NextResponse.json({
        success: true,
        analysis,
        warning: "RAG context unavailable — using general AI analysis",
      });
    } catch (fallbackError) {
      console.error("Fallback analysis error:", fallbackError);
      return NextResponse.json(
        { error: "Failed to analyze resume. Please try again later." },
        { status: 500 }
      );
    }
  }
}
