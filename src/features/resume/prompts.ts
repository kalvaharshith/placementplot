// ─── Resume Analysis Prompt Templates ───────────────────────────
// These prompts are augmented with RAG-retrieved context at runtime.

export const RESUME_ANALYSIS_SYSTEM = `You are an expert ATS (Applicant Tracking System) resume analyst and career advisor specializing in Indian engineering placements. You have deep knowledge of:
- How ATS software parses and scores resumes
- Indian campus placement standards and expectations
- Resume formatting best practices for tech roles
- Keyword optimization for software engineering positions

Your analysis must be:
1. SPECIFIC — point to exact lines/sections that need improvement
2. ACTIONABLE — give clear, implementable suggestions
3. GROUNDED — reference the ATS rules and examples provided in the context
4. ENCOURAGING — acknowledge strengths while highlighting improvements`;

export function buildResumeAnalysisPrompt(
  resumeText: string,
  retrievedContext: string,
  jobDescription?: string
): string {
  return `${retrievedContext}

---

RESUME TEXT TO ANALYZE:
${resumeText}

${jobDescription ? `TARGET JOB DESCRIPTION:\n${jobDescription}\n\n---` : ""}

TASK: Analyze this resume and provide a comprehensive ATS compatibility assessment.

Return a JSON response with this exact structure:
{
  "overallScore": <number 0-100>,
  "scores": {
    "formatting": { "score": <0-100>, "feedback": "<specific feedback>" },
    "keywords": { "score": <0-100>, "feedback": "<specific feedback>", "missing": ["<keyword1>", "<keyword2>"] },
    "structure": { "score": <0-100>, "feedback": "<specific feedback>" },
    "impact": { "score": <0-100>, "feedback": "<specific feedback>" },
    "consistency": { "score": <0-100>, "feedback": "<specific feedback>" },
    "relevance": { "score": <0-100>, "feedback": "<specific feedback>" }
  },
  "suggestions": [
    {
      "priority": "high" | "medium" | "low",
      "category": "<category name>",
      "issue": "<what's wrong>",
      "suggestion": "<how to fix it>",
      "example": "<example from the knowledge base if available>"
    }
  ],
  "strengths": ["<strength 1>", "<strength 2>"],
  "summary": "<2-3 sentence overall assessment>"
}`;
}

// ─── Resume Bullet Enhancement ─────────────────────────────────

export const BULLET_ENHANCE_SYSTEM = `You are a resume bullet point writing expert. You specialize in transforming weak resume bullets into powerful, quantified, action-driven statements using the STAR (Situation, Task, Action, Result) and XYZ (Accomplished X by doing Y, resulting in Z) frameworks.

Rules:
1. Always start with a strong action verb
2. Include quantified metrics wherever possible
3. Focus on impact and results, not just duties
4. Keep bullets concise (1-2 lines max)
5. Reference the provided examples of high-scoring bullets for inspiration
6. Tailor to the tech/engineering placement context`;

export function buildBulletEnhancePrompt(
  bullet: string,
  retrievedExamples: string,
  context?: { role?: string; industry?: string }
): string {
  return `${retrievedExamples}

---

WEAK BULLET POINT TO ENHANCE:
"${bullet}"

${context?.role ? `TARGET ROLE: ${context.role}` : ""}
${context?.industry ? `INDUSTRY: ${context.industry}` : ""}

TASK: Rewrite this bullet point using STAR/XYZ framework. Provide 3 variations.

Return JSON:
{
  "original": "${bullet}",
  "enhanced": [
    {
      "text": "<enhanced version 1 - STAR method>",
      "method": "STAR",
      "improvements": ["<what was improved>"]
    },
    {
      "text": "<enhanced version 2 - XYZ formula>",
      "method": "XYZ",
      "improvements": ["<what was improved>"]
    },
    {
      "text": "<enhanced version 3 - Impact-focused>",
      "method": "Impact",
      "improvements": ["<what was improved>"]
    }
  ],
  "tips": ["<general improvement tip 1>", "<tip 2>"],
  "inspiredBy": ["<which retrieved example inspired the rewrite>"]
}`;
}
