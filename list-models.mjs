import fs from "fs";
import path from "path";

const envPath = path.resolve(".env.local");
let apiKey = "";

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    if (line.startsWith("GEMINI_API_KEY=")) {
      apiKey = line.split("=")[1].trim();
    }
  }
}

async function listModels() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    console.log("Supported Models:");
    data.models?.forEach((m) => {
      console.log(`- ${m.name} (supports: ${m.supportedGenerationMethods?.join(", ")})`);
    });
  } catch (e) {
    console.error("Failed to fetch models list:", e);
  }
}

listModels();
