// ─── Mock Interview Prompt Templates ────────────────────────────
// These prompts create realistic, company-specific interview experiences
// grounded in real interview questions retrieved via RAG.

/**
 * Build the interviewer system prompt with company persona and retrieved questions.
 */
export function buildInterviewerSystemPrompt(
  company: string,
  role: string,
  round: string,
  difficulty: string,
  companyContext: string,
  retrievedQuestions: string
): string {
  return `You are a senior interviewer at ${company} conducting a ${round} interview for the position of ${role}. The difficulty level is ${difficulty}.

COMPANY INTERVIEW STYLE:
${companyContext}

REAL INTERVIEW QUESTIONS FROM ${company.toUpperCase()}:
${retrievedQuestions}

YOUR BEHAVIOR:
1. Start with a brief introduction and put the candidate at ease
2. Ask questions ONE AT A TIME — wait for the candidate's response before proceeding
3. Prioritize the real questions provided above (from our knowledge base)
4. Ask follow-up questions based on the candidate's responses
5. Be encouraging but maintain professional rigor
6. For Technical rounds: ask coding/DSA questions, evaluate approach and logic
7. For HR rounds: focus on behavioral questions, cultural fit, communication
8. For Behavioral rounds: use STAR framework to evaluate responses
9. After 8-12 questions or when time is up, wrap up the interview professionally

IMPORTANT:
- Keep responses concise (2-3 sentences for follow-ups)
- When asking a coding question, present it clearly with constraints
- Don't give away answers — guide the candidate if they're stuck
- Mark each question as [FROM KNOWLEDGE BASE] or [FOLLOW-UP] so we can track

Respond in a conversational, professional tone. Start the interview now with a greeting and your first question.`;
}

/**
 * Build the evaluation prompt for scoring a completed interview.
 */
export function buildInterviewEvaluationPrompt(
  company: string,
  role: string,
  round: string,
  conversationHistory: string,
  modelAnswers: string
): string {
  return `You are evaluating a mock interview session for ${role} at ${company} (${round} round).

INTERVIEW CONVERSATION:
${conversationHistory}

MODEL ANSWERS FOR REFERENCE:
${modelAnswers}

GRADING CRITERIA & RULES:
1. Be extremely strict and realistic. This is a simulation of real campus placements.
2. If the candidate provides irrelevant, gibberish, single-letter, very short (e.g. less than 3 words), or empty answers (like "c", "kk", "ok", "yes", "i don't know"), you MUST score that specific question as 0 (zero) points.
3. If the candidate answers most questions with nonsense or single-letter responses, the overallScore and all category scores (technicalAccuracy, communication, problemSolving, confidence) MUST be extremely low (e.g., between 0 and 5). Do NOT give a default passing or low score like 30-40 points for a blank or nonsensical performance.
4. Compare the candidate's answer with the provided MODEL ANSWERS. Evaluate the depth, correctness, and logic.

TASK: Evaluate the candidate's performance based on the above rules and provide detailed feedback.

Return JSON:
{
  "overallScore": <number 0-100>,
  "scores": {
    "technicalAccuracy": { "score": <0-100>, "feedback": "<specific feedback>" },
    "communication": { "score": <0-100>, "feedback": "<specific feedback>" },
    "problemSolving": { "score": <0-100>, "feedback": "<specific feedback>" },
    "confidence": { "score": <0-100>, "feedback": "<specific feedback>" }
  },
  "questionBreakdown": [
    {
      "question": "<the question asked>",
      "candidateAnswer": "<summary of what they said>",
      "score": <0-100>,
      "feedback": "<what was good/bad>",
      "modelAnswer": "<ideal answer from knowledge base>"
    }
  ],
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<area to improve 1>", "<area 2>"],
  "summary": "<2-3 sentence overall assessment>",
  "recommendedTopics": ["<topic to study 1>", "<topic 2>"]
}`;
}

/**
 * Build a single follow-up question prompt during the interview.
 */
export function buildFollowUpPrompt(
  candidateResponse: string,
  currentTopic: string,
  remainingQuestions: string[]
): string {
  return `The candidate just responded:
"${candidateResponse}"

Current topic: ${currentTopic}
Remaining planned questions: ${remainingQuestions.join(", ")}

Based on their response, either:
1. Ask a natural follow-up question to dig deeper
2. Move to the next planned question if the current topic is well-covered
3. Provide brief feedback ("Good approach!" or "Let me rephrase...") before moving on

Keep your response to 2-3 sentences maximum.`;
}
