import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai";
import { retrieveAndAugment, buildAugmentedPrompt } from "@/lib/rag";
import {
  RESUME_ANALYSIS_SYSTEM,
  buildResumeAnalysisPrompt,
} from "@/features/resume/prompts";
import {
  FraudShield,
  getClientIP,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/fraud-shield";

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

// ─── Constants ─────────────────────────────────────────────────

const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MIN_RESUME_LENGTH = 50;

// ─── POST /api/resume/analyze ──────────────────────────────────

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || undefined;

  // ── FraudShield: Rate limit (5 analyses/10min per IP) ──
  const rateCheck = FraudShield.checkRateLimit(
    `resume:analyze:${ip}`,
    RATE_LIMITS.resumeAnalyze
  );
  if (!rateCheck.allowed) {
    FraudShield.logFraudEvent({
      eventType: "rate_limit",
      severity: "medium",
      ipAddress: ip,
      userAgent,
      route: "/api/resume/analyze",
      details: { hits: rateCheck.totalHits },
      actionTaken: "rate_limited",
      riskScore: 50,
    });
    return rateLimitResponse(rateCheck, "resume:analyze");
  }

  let resumeText = "";
  let jobDescription: string | undefined = undefined;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    resumeText = formData.get("resumeText") as string;
    jobDescription = (formData.get("jobDescription") as string) || undefined;

    if (file) {
      // ── FraudShield: Validate PDF size (max 5MB) ──
      if (file.size > MAX_PDF_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum allowed size is 5MB.` },
          { status: 400 }
        );
      }

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uint8Array = new Uint8Array(buffer);
        const pdf = await getDocumentProxy(uint8Array);
        const { text } = await extractText(pdf, { mergePages: true });
        resumeText = text;
      } catch (pdfErr: any) {
        console.error("PDF parsing error:", pdfErr);
        return NextResponse.json(
          { error: `Could not read the uploaded PDF file. It may be corrupted, password-protected, or a scanned image. Please upload a text-based PDF generated from Word or Google Docs. (${pdfErr.message || "Parse error"})` },
          { status: 400 }
        );
      }
    }

    if (!resumeText || resumeText.trim().length < MIN_RESUME_LENGTH) {
      return NextResponse.json(
        { error: "Resume text/file is too short. Please provide at least 50 characters or a valid PDF." },
        { status: 400 }
      );
    }

    // ── FraudShield: AI abuse check on resume text ──
    const abuseCheck = FraudShield.checkAIAbuse({
      ipAddress: ip,
      route: "/api/resume/analyze",
      inputText: resumeText,
      userAgent,
      payloadSizeBytes: new Blob([resumeText]).size,
    });

    if (!abuseCheck.allowed) {
      FraudShield.logFraudEvent({
        eventType: "ai_abuse",
        severity: "high",
        ipAddress: ip,
        userAgent,
        route: "/api/resume/analyze",
        details: {
          signals: abuseCheck.signals,
          textPreview: resumeText.substring(0, 200),
        },
        actionTaken: "blocked",
        riskScore: abuseCheck.riskScore,
      });
      return NextResponse.json(
        { error: "Your submission was flagged by our security system. Please upload a genuine resume." },
        { status: 403 }
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
      if (!resumeText || resumeText.trim().length < MIN_RESUME_LENGTH) {
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
    } catch (fallbackError: any) {
      console.error("Fallback analysis error:", fallbackError);
      const msg = fallbackError.message?.includes("API key") || fallbackError.message?.includes("401")
        ? "AI service authentication failed. Please check the Gemini API key configuration."
        : fallbackError.message?.includes("quota") || fallbackError.message?.includes("429")
        ? "AI service rate limit reached. Please wait a minute and try again."
        : "Failed to analyze resume. The AI service may be temporarily unavailable. Please try again later.";
      return NextResponse.json(
        { error: msg },
        { status: 500 }
      );
    }
  }
}
