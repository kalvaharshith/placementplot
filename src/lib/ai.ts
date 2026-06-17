import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// ─── Gemini Client ──────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ─── Generation Models ─────────────────────────────────────────

const GENERATION_MODEL = "gemini-2.5-flash";

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

/**
 * Generate text with Gemini Flash
 */
export async function generateText(
  prompt: string,
  systemInstruction?: string,
  options?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  }
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: GENERATION_MODEL,
    safetySettings,
    systemInstruction: systemInstruction || undefined,
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxOutputTokens ?? 4096,
      responseMimeType: options?.responseMimeType,
    },
  });

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

/**
 * Generate structured JSON output
 */
export async function generateJSON<T>(
  prompt: string,
  systemInstruction?: string,
  options?: {
    temperature?: number;
    maxOutputTokens?: number;
  }
): Promise<T> {
  const text = await generateText(prompt, systemInstruction, {
    ...options,
    responseMimeType: "application/json",
  });

  try {
    return JSON.parse(text) as T;
  } catch {
    // Sometimes Gemini wraps JSON in markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]) as T;
    }
    throw new Error(`Failed to parse Gemini response as JSON: ${text.substring(0, 200)}`);
  }
}

/**
 * Streaming text generation
 */
export async function* generateTextStream(
  prompt: string,
  systemInstruction?: string,
  options?: {
    temperature?: number;
    maxOutputTokens?: number;
  }
): AsyncGenerator<string> {
  const model = genAI.getGenerativeModel({
    model: GENERATION_MODEL,
    safetySettings,
    systemInstruction: systemInstruction || undefined,
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxOutputTokens ?? 4096,
    },
  });

  const result = await model.generateContentStream(prompt);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      yield text;
    }
  }
}

/**
 * Chat-based generation (for mock interviews)
 */
export function createChatSession(
  systemInstruction: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[] = []
) {
  const model = genAI.getGenerativeModel({
    model: GENERATION_MODEL,
    safetySettings,
    systemInstruction,
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 2048,
    },
  });

  return model.startChat({ history });
}
