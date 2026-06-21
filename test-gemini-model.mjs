import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const modelsToTest = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-flash-latest"];

async function testAll() {
  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say 'AI generation works for " + modelName + "!'");
      console.log(`✅ SUCCESS [${modelName}]:`, result.response.text().trim());
      return; // Stop on first working model!
    } catch (e) {
      console.error(`❌ FAIL [${modelName}]:`, e.message || e);
    }
  }
}

testAll();
