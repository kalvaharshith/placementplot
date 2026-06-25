import { NextRequest, NextResponse } from "next/server";
import { createChatSession } from "@/lib/ai";
import { generateJSON } from "@/lib/ai";
import { retrieveAndAugment } from "@/lib/rag";
import {
  buildInterviewerSystemPrompt,
  buildInterviewEvaluationPrompt,
} from "@/features/interview/prompts";

// ─── POST /api/interview ───────────────────────────────────────
// Handles both starting a new interview and sending messages.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "start") {
      return handleStartInterviewStream(body);
    } else if (action === "message") {
      return handleMessageStream(body);
    } else if (action === "evaluate") {
      return handleEvaluate(body);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Interview API error:", error);
    return NextResponse.json(
      { error: "Interview service error. Please try again." },
      { status: 500 }
    );
  }
}

// ─── Start Interview Stream ────────────────────────────────────

async function handleStartInterviewStream(body: {
  company: string;
  role: string;
  round: string;
  difficulty: string;
}) {
  const { company, role, round, difficulty } = body;

  // ── RAG: Retrieve real questions from KB3 ──
  let retrievedQuestions = "Use general interview questions appropriate for this company and round.";
  try {
    const { context } = await retrieveAndAugment(
      `${company} ${round} ${role} interview questions ${difficulty}`,
      "interview_bank",
      {
        topK: 15,
        contextHeader: `REAL ${company.toUpperCase()} AND RELATED INTERVIEW QUESTIONS:`,
      }
    );
    if (context) retrievedQuestions = context;
  } catch (ragErr) {
    console.warn("RAG retrieval for questions failed, using general questions:", ragErr);
  }

  // ── RAG: Retrieve company interview patterns from KB4 ──
  let companyContext = `${company} is a well-known technology company. Conduct a professional ${round} interview.`;
  try {
    const { context } = await retrieveAndAugment(
      `${company} interview process hiring pattern ${round}`,
      "company_profiles",
      {
        topK: 3,
        contextHeader: `${company.toUpperCase()} INTERVIEW STYLE AND PATTERNS:`,
      }
    );
    if (context) companyContext = context;
  } catch (ragErr) {
    console.warn("RAG retrieval for company patterns failed:", ragErr);
  }

  // ── Build system prompt ──
  const systemPrompt = buildInterviewerSystemPrompt(
    company,
    role,
    round,
    difficulty,
    companyContext,
    retrievedQuestions
  );

  const interviewId = crypto.randomUUID();
  const systemPromptBase64 = Buffer.from(systemPrompt).toString("base64");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const chat = createChatSession(systemPrompt);
        const result = await chat.sendMessageStream(
          "Start the interview. Greet the candidate and ask your first question."
        );
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
      } catch (err: any) {
        console.error("Start interview stream failed:", err);
        // Stream a clear error message instead of fake data
        const errorMessage = `[ERROR] Failed to start the interview session. ${
          err.message?.includes("quota") || err.message?.includes("429")
            ? "The AI service is currently rate-limited. Please wait a minute and try again."
            : err.message?.includes("API key") || err.message?.includes("401") || err.message?.includes("403")
            ? "AI service authentication failed. Please check the API key configuration."
            : "Please check your internet connection and try again."
        }`;
        controller.enqueue(encoder.encode(errorMessage));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "x-system-prompt": systemPromptBase64,
      "x-interview-id": interviewId,
      "Access-Control-Expose-Headers": "x-system-prompt, x-interview-id",
    },
  });
}

// ─── Send Message Stream ───────────────────────────────────────

async function handleMessageStream(body: {
  systemPrompt: string;
  history: { role: "user" | "model"; parts: { text: string }[] }[];
  message: string;
}) {
  const { systemPrompt, history, message } = body;

  if (!systemPrompt || systemPrompt.trim().length === 0) {
    return new Response(
      "[ERROR] Interview session context was lost. Please start a new interview.",
      {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Adjust history: Gemini chat requires the first message to have the 'user' role.
        let adjustedHistory = [...history];
        if (adjustedHistory.length > 0 && adjustedHistory[adjustedHistory.length - 1].role === "user") {
          adjustedHistory.pop();
        }
        if (adjustedHistory.length > 0 && adjustedHistory[0].role === "model") {
          adjustedHistory.unshift({
            role: "user",
            parts: [{ text: "Hello, I am ready for the interview." }],
          });
        }

        const chat = createChatSession(systemPrompt, adjustedHistory);
        const result = await chat.sendMessageStream(message);
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
      } catch (err: any) {
        console.error("Message stream failed:", err);
        const errorMessage = `[ERROR] Failed to get AI response. ${
          err.message?.includes("quota") || err.message?.includes("429")
            ? "Rate limit reached. Please wait a moment before sending another message."
            : "Please try sending your message again."
        }`;
        controller.enqueue(encoder.encode(errorMessage));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}

// ─── Evaluate Interview ────────────────────────────────────────

async function handleEvaluate(body: {
  company: string;
  role: string;
  round: string;
  history: { role: "user" | "model"; parts: { text: string }[] }[];
}) {
  const { company, role, round, history } = body;

  // Validate that there's actual conversation content to evaluate
  const userMessages = history.filter((h) => h.role === "user");
  if (userMessages.length === 0) {
    return NextResponse.json(
      { error: "No conversation to evaluate. Please answer at least one question before ending the interview." },
      { status: 400 }
    );
  }

  // Filter out any error messages from the conversation before evaluating
  const cleanHistory = history.filter(
    (h) => !h.parts[0]?.text?.startsWith("[ERROR]")
  );

  try {
    // Format conversation for evaluation
    const conversationHistory = cleanHistory
      .map((msg) => {
        const speaker = msg.role === "model" ? "Interviewer" : "Candidate";
        return `${speaker}: ${msg.parts[0].text}`;
      })
      .join("\n\n");

    // ── RAG: Retrieve model answers from KB3 ──
    let modelAnswers = "Evaluate based on general best practices for this role.";
    try {
      const questions = cleanHistory
        .filter((m) => m.role === "model")
        .map((m) => m.parts[0].text)
        .join(" ");

      const { context } = await retrieveAndAugment(
        questions.substring(0, 1000),
        "interview_bank",
        {
          topK: 12,
          contextHeader: "MODEL ANSWERS FROM KNOWLEDGE BASE:",
        }
      );
      if (context) modelAnswers = context;
    } catch (ragErr) {
      console.warn("RAG retrieval for model answers failed, using general evaluation:", ragErr);
    }

    const prompt = buildInterviewEvaluationPrompt(
      company,
      role,
      round,
      conversationHistory,
      modelAnswers
    );

    const evaluation = await generateJSON(
      prompt,
      "You are an expert interview evaluator. Provide fair, constructive, and specific feedback.",
      { temperature: 0.3, maxOutputTokens: 4096 }
    );

    return NextResponse.json({
      success: true,
      evaluation,
    });
  } catch (err: any) {
    console.error("Evaluation failed:", err);
    return NextResponse.json(
      {
        error: `Failed to evaluate interview performance. ${
          err.message?.includes("quota") || err.message?.includes("429")
            ? "AI service rate limit reached. Please try again in a minute."
            : err.message?.includes("API key") || err.message?.includes("401")
            ? "AI service authentication error. Please contact support."
            : "Please try again."
        }`,
      },
      { status: 500 }
    );
  }
}
