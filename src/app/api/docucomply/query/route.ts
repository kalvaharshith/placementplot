import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { redactPII } from "@/lib/pii-redact";
import { retrieveAndAugment } from "@/lib/rag";
import { generateText } from "@/lib/ai";
import {
  DOCUCOMPLY_QA_SYSTEM,
  buildDocQAPrompt,
} from "@/features/docucomply/prompts";
import {
  FraudShield,
  getClientIP,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/fraud-shield";

// ─── Constants ─────────────────────────────────────────────────

const MAX_QUESTION_LENGTH = 2000;
const QUERY_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 600_000, // 10 minutes
  label: "docucomply:query",
};

// ─── POST /api/docucomply/query ────────────────────────────────

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || undefined;

  // ── FraudShield: Rate limit ──
  const rateCheck = FraudShield.checkRateLimit(
    `docucomply:query:${ip}`,
    QUERY_RATE_LIMIT
  );
  if (!rateCheck.allowed) {
    FraudShield.logFraudEvent({
      eventType: "rate_limit",
      severity: "medium",
      ipAddress: ip,
      userAgent,
      route: "/api/docucomply/query",
      details: { hits: rateCheck.totalHits },
      actionTaken: "rate_limited",
      riskScore: 45,
    });
    return rateLimitResponse(rateCheck, "docucomply:query");
  }

  try {
    const supabase = createServerSupabase();

    // ── Auth check ──
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in to query documents." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== "string" || question.trim().length < 3) {
      return NextResponse.json(
        { error: "Please provide a question with at least 3 characters." },
        { status: 400 }
      );
    }

    if (question.length > MAX_QUESTION_LENGTH) {
      return NextResponse.json(
        { error: `Question is too long (max ${MAX_QUESTION_LENGTH} characters).` },
        { status: 400 }
      );
    }

    // ── FraudShield: Prompt injection check ──
    const abuseCheck = FraudShield.checkAIAbuse({
      ipAddress: ip,
      userId: user.id,
      route: "/api/docucomply/query",
      inputText: question,
      userAgent,
    });

    if (!abuseCheck.allowed) {
      FraudShield.logFraudEvent({
        eventType: "prompt_injection",
        severity: "high",
        userId: user.id,
        ipAddress: ip,
        userAgent,
        route: "/api/docucomply/query",
        details: {
          signals: abuseCheck.signals,
          questionPreview: question.substring(0, 200),
        },
        actionTaken: "blocked",
        riskScore: abuseCheck.riskScore,
      });
      return NextResponse.json(
        { error: "Your question was flagged by our security system. Please rephrase." },
        { status: 403 }
      );
    }

    // ── Redact PII from the question itself ──
    const redactedQuestion = redactPII(question);
    const cleanQuestion = redactedQuestion.redactedText;

    // ── Get user's document names ──
    const { data: userDocs } = await supabase
      .from("user_documents")
      .select("file_name")
      .eq("user_id", user.id)
      .eq("status", "indexed");

    const documentNames = (userDocs || []).map((d) => d.file_name);

    if (documentNames.length === 0) {
      return NextResponse.json({
        success: true,
        answer:
          "You haven't uploaded any documents yet. Please upload a document first using the upload section above.",
        sources: [],
        questionRedacted: redactedQuestion.totalRedactions > 0,
      });
    }

    // ── Retrieve relevant chunks (scoped to this user's documents) ──
    const { context, chunks } = await retrieveAndAugment(
      cleanQuestion,
      "user_documents",
      {
        filters: { user_id: user.id },
        topK: 8,
        minSimilarity: 0.2,
        maxChunkLength: 600,
        contextHeader: "RETRIEVED DOCUMENT SECTIONS:",
      }
    );

    if (chunks.length === 0) {
      return NextResponse.json({
        success: true,
        answer:
          "I couldn't find relevant information in your uploaded documents for this question. Try rephrasing your question or uploading additional documents.",
        sources: [],
        questionRedacted: redactedQuestion.totalRedactions > 0,
      });
    }

    // ── Build prompt and generate answer ──
    const prompt = buildDocQAPrompt(cleanQuestion, context, documentNames);
    const answer = await generateText(prompt, DOCUCOMPLY_QA_SYSTEM, {
      temperature: 0.3,
      maxOutputTokens: 2048,
    });

    // ── Extract source citations ──
    const sources = chunks.map((chunk, i) => ({
      sourceIndex: i + 1,
      fileName: (chunk.metadata as Record<string, unknown>)?.file_name as string || "Unknown",
      chunkIndex: (chunk.metadata as Record<string, unknown>)?.chunk_index as number ?? i,
      relevance: Math.round(chunk.similarity * 100),
      preview: chunk.content.substring(0, 150) + (chunk.content.length > 150 ? "..." : ""),
    }));

    return NextResponse.json({
      success: true,
      answer,
      sources,
      questionRedacted: redactedQuestion.totalRedactions > 0,
      questionRedactionDetails: redactedQuestion.totalRedactions > 0
        ? {
            piiTypesFound: redactedQuestion.piiTypesFound,
            totalRedacted: redactedQuestion.totalRedactions,
          }
        : undefined,
    });
  } catch (error: any) {
    console.error("DocuComply query error:", error);

    const msg =
      error.message?.includes("API key") || error.message?.includes("401")
        ? "AI service authentication failed. Please contact support."
        : error.message?.includes("quota") || error.message?.includes("429")
        ? "AI service rate limit reached. Please try again in a minute."
        : "Failed to process your question. Please try again.";

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
