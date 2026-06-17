import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { jsonrepair } from "jsonrepair";

// ─── Gemini Client ──────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ─── Generation Models ─────────────────────────────────────────

const GENERATION_MODEL = "gemini-2.5-flash-lite";

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

  let retries = 3;
  let delay = 1000;
  while (retries > 0) {
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (err: any) {
      retries--;
      const status = err.status || (err.message && err.message.includes("503") ? 503 : 0);
      const isTransient = status === 503 || status === 429 || 
        (err.message && (
          err.message.includes("demand") || 
          err.message.includes("rate limit") || 
          err.message.includes("exhausted") ||
          err.message.includes("Service Unavailable") ||
          err.message.includes("Too Many Requests")
        ));
      
      if (retries === 0 || !isTransient) {
        throw err;
      }
      console.warn(`Gemini generation transient error (status ${status}). Retrying in ${delay}ms... remaining retries: ${retries}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // exponential backoff
    }
  }
  throw new Error("Failed after retries");
}

function cleanJsonString(str: string): string {
  // Remove control characters that are invalid in JSON string values
  // (ASCII 0-31 except tab \x09, line feed \x0A, carriage return \x0D)
  let cleaned = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  
  // Use jsonrepair to fix structural formatting, missing quotes, single quotes, brackets, etc.
  try {
    cleaned = jsonrepair(cleaned);
  } catch (repairErr: any) {
    console.warn("jsonrepair was unable to repair string. Error:", repairErr.message);
  }
  
  // Strip trailing commas before closing braces/brackets (as a fallback)
  cleaned = cleaned.replace(/,(\s*[\]}])/g, "$1");
  
  return cleaned;
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

  // Check if Gemini wrapped JSON in markdown code blocks
  let jsonString = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1];
  }

  const cleaned = cleanJsonString(jsonString);

  try {
    return JSON.parse(cleaned) as T;
  } catch (err: any) {
    console.error("JSON parsing failed. Error:", err.message);
    console.error("Raw text from Gemini:", text);
    console.error("Cleaned text:", cleaned);
    throw new Error(`Failed to parse Gemini response as JSON: ${err.message}. Raw sample: ${text.substring(0, 300)}`);
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

  let result;
  let retries = 3;
  let delay = 1000;
  while (retries > 0) {
    try {
      result = await model.generateContentStream(prompt);
      break;
    } catch (err: any) {
      retries--;
      const status = err.status || (err.message && err.message.includes("503") ? 503 : 0);
      const isTransient = status === 503 || status === 429 || 
        (err.message && (
          err.message.includes("demand") || 
          err.message.includes("rate limit") || 
          err.message.includes("exhausted") ||
          err.message.includes("Service Unavailable") ||
          err.message.includes("Too Many Requests")
        ));
      
      if (retries === 0 || !isTransient) {
        throw err;
      }
      console.warn(`Gemini stream setup transient error (status ${status}). Retrying in ${delay}ms... remaining: ${retries}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  if (!result) {
    throw new Error("Failed to initialize stream after retries");
  }

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
