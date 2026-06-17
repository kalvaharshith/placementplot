import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

try {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent("hello");
  const embedding = result.embedding.values;
  console.log("SUCCESS! Embedding length is:", embedding.length);
} catch (e) {
  console.error("FAIL:", e);
}
