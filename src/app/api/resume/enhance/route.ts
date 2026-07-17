import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai";
import { retrieveAndAugment } from "@/lib/rag";
import {
  BULLET_ENHANCE_SYSTEM,
  buildBulletEnhancePrompt,
} from "@/features/resume/prompts";
import {
  FraudShield,
  getClientIP,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/fraud-shield";

// ─── Constants ─────────────────────────────────────────────────

const MAX_BULLET_LENGTH = 2000;

// ─── POST /api/resume/enhance ──────────────────────────────────

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || undefined;

  // ── FraudShield: Rate limit (10 enhancements/10min per IP) ──
  const rateCheck = FraudShield.checkRateLimit(
    `resume:enhance:${ip}`,
    RATE_LIMITS.resumeEnhance
  );
  if (!rateCheck.allowed) {
    FraudShield.logFraudEvent({
      eventType: "rate_limit",
      severity: "medium",
      ipAddress: ip,
      userAgent,
      route: "/api/resume/enhance",
      details: { hits: rateCheck.totalHits },
      actionTaken: "rate_limited",
      riskScore: 45,
    });
    return rateLimitResponse(rateCheck, "resume:enhance");
  }

  try {
    const body = await request.json();
    const { bullet, role, industry } = body;

    if (!bullet || bullet.trim().length < 10) {
      return NextResponse.json(
        { error: "Bullet point text is too short." },
        { status: 400 }
      );
    }

    // ── FraudShield: Validate bullet length (max 2000 chars) ──
    if (bullet.length > MAX_BULLET_LENGTH) {
      return NextResponse.json(
        { error: `Bullet text is too long (${bullet.length} chars). Maximum is ${MAX_BULLET_LENGTH} characters.` },
        { status: 400 }
      );
    }

    // ── FraudShield: Check for prompt injection ──
    const abuseCheck = FraudShield.checkAIAbuse({
      ipAddress: ip,
      route: "/api/resume/enhance",
      inputText: bullet,
      userAgent,
    });

    if (!abuseCheck.allowed) {
      FraudShield.logFraudEvent({
        eventType: "prompt_injection",
        severity: "high",
        ipAddress: ip,
        userAgent,
        route: "/api/resume/enhance",
        details: {
          signals: abuseCheck.signals,
          textPreview: bullet.substring(0, 200),
        },
        actionTaken: "blocked",
        riskScore: abuseCheck.riskScore,
      });
      return NextResponse.json(
        { error: "Your input was flagged by our security system. Please provide a genuine resume bullet point." },
        { status: 403 }
      );
    }

    // ── RAG: Retrieve similar high-scoring bullets from KB2 ──
    let retrievedExamples = "No examples available — enhance based on general best practices.";
    try {
      const { context } = await retrieveAndAugment(
        bullet,
        "resume_examples",
        {
          topK: 8,
          filters: role ? { role } : undefined,
          contextHeader: "HIGH-SCORING RESUME BULLETS FOR INSPIRATION:",
        }
      );
      if (context) retrievedExamples = context;
    } catch {
      // RAG not available, continue with fallback
    }

    // ── Build prompt and generate ──
    const prompt = buildBulletEnhancePrompt(bullet, retrievedExamples, {
      role,
      industry,
    });

    const result = await generateJSON(prompt, BULLET_ENHANCE_SYSTEM, {
      temperature: 0.7,
      maxOutputTokens: 2048,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Bullet enhancement error:", error);
    return NextResponse.json(
      { error: "Failed to enhance bullet point. Please try again." },
      { status: 500 }
    );
  }
}
