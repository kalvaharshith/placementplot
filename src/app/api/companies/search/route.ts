import { NextRequest, NextResponse } from "next/server";
import { retrieveAndAugment } from "@/lib/rag";

// ─── Mock static companies data for fallback ───────────────────
const staticCompanies = [
  { name: "TCS", type: "Service", difficulty: "Medium", ctc: "3.6–7 LPA", questions: 250, logo: "T", gradient: "from-blue-600 to-blue-400" },
  { name: "Infosys", type: "Service", difficulty: "Medium", ctc: "3.6–6 LPA", questions: 220, logo: "I", gradient: "from-cyan-600 to-cyan-400" },
  { name: "Wipro", type: "Service", difficulty: "Easy", ctc: "3.5–5 LPA", questions: 180, logo: "W", gradient: "from-violet-600 to-violet-400" },
  { name: "Google", type: "Product", difficulty: "Hard", ctc: "25–45 LPA", questions: 320, logo: "G", gradient: "from-red-500 to-yellow-400" },
  { name: "Microsoft", type: "Product", difficulty: "Hard", ctc: "20–40 LPA", questions: 280, logo: "M", gradient: "from-emerald-500 to-teal-400" },
  { name: "Amazon", type: "Product", difficulty: "Hard", ctc: "22–42 LPA", questions: 310, logo: "A", gradient: "from-amber-500 to-orange-400" },
  { name: "Adobe", type: "Product", difficulty: "Hard", ctc: "18–35 LPA", questions: 200, logo: "Ad", gradient: "from-red-600 to-red-400" },
  { name: "Goldman Sachs", type: "Product", difficulty: "Hard", ctc: "20–38 LPA", questions: 190, logo: "GS", gradient: "from-sky-600 to-sky-400" },
  { name: "Flipkart", type: "Product", difficulty: "Hard", ctc: "18–32 LPA", questions: 210, logo: "F", gradient: "from-yellow-500 to-yellow-300" },
  { name: "Cognizant", type: "Service", difficulty: "Medium", ctc: "4–8 LPA", questions: 160, logo: "C", gradient: "from-indigo-600 to-indigo-400" },
  { name: "Accenture", type: "Service", difficulty: "Medium", ctc: "4.5–8 LPA", questions: 170, logo: "Ac", gradient: "from-purple-600 to-purple-400" },
  { name: "Razorpay", type: "Product", difficulty: "Hard", ctc: "15–30 LPA", questions: 120, logo: "R", gradient: "from-blue-500 to-indigo-500" },
  { name: "Paytm", type: "Product", difficulty: "Medium", ctc: "12–25 LPA", questions: 140, logo: "P", gradient: "from-sky-400 to-blue-400" },
  { name: "Swiggy", type: "Product", difficulty: "Medium", ctc: "14–28 LPA", questions: 130, logo: "S", gradient: "from-orange-500 to-orange-300" },
  { name: "Zomato", type: "Product", difficulty: "Medium", ctc: "14–26 LPA", questions: 125, logo: "Z", gradient: "from-red-500 to-pink-400" },
  { name: "HCL", type: "Service", difficulty: "Easy", ctc: "3.5–6 LPA", questions: 150, logo: "H", gradient: "from-blue-700 to-blue-500" },
  { name: "Tech Mahindra", type: "Service", difficulty: "Medium", ctc: "3.5–6 LPA", questions: 130, logo: "TM", gradient: "from-pink-600 to-pink-400" },
  { name: "Capgemini", type: "Service", difficulty: "Medium", ctc: "4–7 LPA", questions: 145, logo: "Ca", gradient: "from-teal-600 to-teal-400" },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const companyFilter = searchParams.get("company") || "";

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        companies: staticCompanies,
        results: [],
      });
    }

    // Build metadata filter when a specific company is selected
    const metadataFilter: Record<string, unknown> = companyFilter
      ? { company: companyFilter.toLowerCase() }
      : {};

    // ── RAG: Perform search on interview_bank ──
    let bankResults: any[] = [];
    try {
      const { chunks } = await retrieveAndAugment(query, "interview_bank", {
        topK: companyFilter ? 12 : 8,
        minSimilarity: 0.25,
        maxChunkLength: 800,
        filters: metadataFilter,
      });
      bankResults = chunks;
    } catch (e) {
      console.warn("RAG search failed for interview bank, using fallback.");
    }

    // ── RAG: Perform search on company_profiles ──
    let profileResults: any[] = [];
    try {
      const { chunks } = await retrieveAndAugment(query, "company_profiles", {
        topK: 2,
        minSimilarity: 0.2,
        filters: metadataFilter,
      });
      profileResults = chunks;
    } catch (e) {
      console.warn("RAG search failed for company profiles, using fallback.");
    }

    // Identify which static companies match either the direct text query or RAG metadata
    const lowerQuery = query.toLowerCase();
    const matchedStaticNames = new Set<string>();

    // Direct text search matching on name
    staticCompanies.forEach((c) => {
      if (c.name.toLowerCase().includes(lowerQuery)) {
        matchedStaticNames.add(c.name);
      }
    });

    // Add company names retrieved from DB metadata
    bankResults.forEach((c) => {
      const compMeta = c.metadata?.company;
      if (typeof compMeta === "string") {
        const found = staticCompanies.find((sc) => sc.name.toLowerCase() === compMeta.toLowerCase());
        if (found) matchedStaticNames.add(found.name);
      }
    });

    profileResults.forEach((c) => {
      const compMeta = c.metadata?.company;
      if (typeof compMeta === "string") {
        const found = staticCompanies.find((sc) => sc.name.toLowerCase() === compMeta.toLowerCase());
        if (found) matchedStaticNames.add(found.name);
      }
    });

    // Filter list to matched or show all if nothing matches
    const filteredCompanies = staticCompanies.filter((c) => matchedStaticNames.has(c.name));

    return NextResponse.json({
      success: true,
      companies: filteredCompanies.length > 0 ? filteredCompanies : staticCompanies,
      results: [
        ...bankResults.map((b) => ({
          type: "question",
          content: b.content,
          metadata: b.metadata,
          score: b.similarity,
        })),
        ...profileResults.map((p) => ({
          type: "profile",
          content: p.content,
          metadata: p.metadata,
          score: p.similarity,
        })),
      ],
    });
  } catch (error: any) {
    console.error("Company search error:", error);
    return NextResponse.json({
      success: true,
      companies: staticCompanies,
      error: error.message,
    });
  }
}
