// ─── Placement Roadmap Prompt Templates ─────────────────────────
// Generate personalized study plans grounded in actual company data.

/**
 * Build the roadmap generation prompt.
 */
export function buildRoadmapPrompt(
  userProfile: {
    skillLevel: string;
    availableHours: number;
    timelineMonths: number;
    targetCompanies: string[];
    strengths?: string[];
    weaknesses?: string[];
    resumeGaps?: string[];
  },
  companyPatterns: string,
  topicsData: string,
  learningResources: string
): string {
  return `COMPANY INTERVIEW PATTERNS:
${companyPatterns}

MOST-ASKED TOPICS FOR TARGET COMPANIES:
${topicsData}

AVAILABLE LEARNING RESOURCES:
${learningResources}

---

STUDENT PROFILE:
- Skill Level: ${userProfile.skillLevel}
- Available Hours/Week: ${userProfile.availableHours}
- Timeline: ${userProfile.timelineMonths} months
- Target Companies: ${userProfile.targetCompanies.join(", ")}
${userProfile.strengths?.length ? `- Strengths: ${userProfile.strengths.join(", ")}` : ""}
${userProfile.weaknesses?.length ? `- Weaknesses: ${userProfile.weaknesses.join(", ")}` : ""}
${userProfile.resumeGaps?.length ? `- Resume Skill Gaps: ${userProfile.resumeGaps.join(", ")}` : ""}

TASK: Create a personalized, week-by-week placement preparation roadmap.

Guidelines:
1. Start with fundamentals, build up to advanced topics
2. Prioritize topics that their target companies ask most
3. Allocate more time to weak areas
4. Include specific resources from the knowledge base (not generic advice)
5. Balance theory study, coding practice, and mock interviews
6. Include weekly milestones and checkpoints
7. Add "why this matters" for each topic (which company asks it)

Return JSON:
{
  "title": "<Personalized Roadmap Title>",
  "totalWeeks": <number>,
  "weeks": [
    {
      "week": <number>,
      "theme": "<Week Theme>",
      "goals": ["<Goal 1>", "<Goal 2>"],
      "tasks": [
        {
          "title": "<Task Title>",
          "description": "<What to do>",
          "type": "study" | "practice" | "mock_interview" | "project" | "revision",
          "estimatedHours": <number>,
          "resources": [
            {
              "title": "<Resource Name>",
              "url": "<URL if available>",
              "type": "video" | "article" | "problem_set" | "course"
            }
          ],
          "relevantCompanies": ["<Company that asks this>"],
          "priority": "high" | "medium" | "low"
        }
      ],
      "milestone": "<What you should be able to do by end of this week>"
    }
  ],
  "tips": ["<General tip 1>", "<Tip 2>"],
  "summary": "<2-3 sentence overview of the plan>"
}`;
}

/**
 * Build a prompt to analyze resume for skill gaps.
 */
export function buildSkillGapPrompt(
  resumeText: string,
  targetCompanyRequirements: string
): string {
  return `RESUME:
${resumeText}

TARGET COMPANY SKILL REQUIREMENTS:
${targetCompanyRequirements}

TASK: Identify skill gaps between this resume and the target company requirements.

Return JSON:
{
  "presentSkills": ["<skill found in resume>"],
  "missingSkills": ["<required skill not in resume>"],
  "weakAreas": ["<skill mentioned but needs strengthening>"],
  "recommendations": ["<specific recommendation>"]
}`;
}
