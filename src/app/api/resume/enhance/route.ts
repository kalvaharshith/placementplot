import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai";
import { retrieveAndAugment } from "@/lib/rag";
import {
  BULLET_ENHANCE_SYSTEM,
  buildBulletEnhancePrompt,
} from "@/features/resume/prompts";

// ─── POST /api/resume/enhance ──────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bullet, role, industry } = body;

    if (!bullet || bullet.trim().length < 10) {
      return NextResponse.json(
        { error: "Bullet point text is too short." },
        { status: 400 }
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
