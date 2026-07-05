"use client";

import { useState } from "react";

/* ───────── Company Data ───────── */
const companies = [
  { name: "TCS", type: "Service", difficulty: "Medium", ctc: "3.6–7 LPA", coverage: "High", logo: "T", gradient: "from-blue-600 to-blue-400", topics: ["DSA", "OOP", "DBMS", "OS", "HR"], rounds: ["NQT Test", "Technical", "HR"] },
  { name: "Infosys", type: "Service", difficulty: "Medium", ctc: "3.6–6 LPA", coverage: "High", logo: "I", gradient: "from-cyan-600 to-cyan-400", topics: ["DBMS", "OOP", "DSA", "OS", "CN"], rounds: ["Online Test", "Technical", "HR"] },
  { name: "Wipro", type: "Service", difficulty: "Easy", ctc: "3.5–5 LPA", coverage: "High", logo: "W", gradient: "from-violet-600 to-violet-400", topics: ["OOP", "DSA", "OS", "CN", "HR"], rounds: ["Online Test", "Technical", "HR"] },
  { name: "Google", type: "Product", difficulty: "Hard", ctc: "25–45 LPA", coverage: "High", logo: "G", gradient: "from-red-500 to-yellow-400", topics: ["DSA", "System Design", "Graphs", "DP", "Behavioral"], rounds: ["OA", "Phone Screen", "Onsite (4-5)"] },
  { name: "Microsoft", type: "Product", difficulty: "Hard", ctc: "20–40 LPA", coverage: "High", logo: "M", gradient: "from-emerald-500 to-teal-400", topics: ["DSA", "Trees", "System Design", "OOP", "Behavioral"], rounds: ["OA", "Group Fly", "Technical (2-3)", "AA Round"] },
  { name: "Amazon", type: "Product", difficulty: "Hard", ctc: "22–42 LPA", coverage: "High", logo: "A", gradient: "from-amber-500 to-orange-400", topics: ["DSA", "Leadership Principles", "System Design", "Behavioral"], rounds: ["OA + Workstyle", "Phone Screen", "Onsite Loop (4-5)"] },
  { name: "Adobe", type: "Product", difficulty: "Hard", ctc: "18–35 LPA", coverage: "High", logo: "Ad", gradient: "from-red-600 to-red-400", topics: ["DSA", "OOP Design", "System Design", "Web Dev"], rounds: ["OA", "Technical (2)", "Hiring Manager"] },
  { name: "Goldman Sachs", type: "Product", difficulty: "Hard", ctc: "20–38 LPA", coverage: "High", logo: "GS", gradient: "from-sky-600 to-sky-400", topics: ["DSA", "DBMS", "OS", "Puzzles", "System Design"], rounds: ["OA + MCQs", "Technical (2)", "Culture Fit"] },
  { name: "Flipkart", type: "Product", difficulty: "Hard", ctc: "18–32 LPA", coverage: "High", logo: "F", gradient: "from-yellow-500 to-yellow-300", topics: ["DSA", "Machine Coding", "System Design", "DBMS"], rounds: ["OA", "Machine Coding", "DSA (2)", "HM Round"] },
  { name: "Cognizant", type: "Service", difficulty: "Medium", ctc: "4–8 LPA", coverage: "High", logo: "C", gradient: "from-indigo-600 to-indigo-400", topics: ["OOP", "DBMS", "DSA", "OS", "HR"], rounds: ["GenC Test", "Technical", "HR"] },
  { name: "Accenture", type: "Service", difficulty: "Medium", ctc: "4.5–8 LPA", coverage: "High", logo: "Ac", gradient: "from-purple-600 to-purple-400", topics: ["Aptitude", "Cloud", "Agile", "OOP", "HR"], rounds: ["Online Test", "Communication", "Technical", "HR"] },
  { name: "Razorpay", type: "Product", difficulty: "Hard", ctc: "15–30 LPA", coverage: "High", logo: "R", gradient: "from-blue-500 to-indigo-500", topics: ["DSA", "System Design", "Payments", "DBMS"], rounds: ["OA", "Technical (2)", "Culture Fit"] },
  { name: "Paytm", type: "Product", difficulty: "Medium", ctc: "12–25 LPA", coverage: "High", logo: "P", gradient: "from-sky-400 to-blue-400", topics: ["DSA", "Web Dev", "DBMS", "System Design"], rounds: ["OA", "Technical (2)", "HR"] },
  { name: "Swiggy", type: "Product", difficulty: "Medium", ctc: "14–28 LPA", coverage: "High", logo: "S", gradient: "from-orange-500 to-orange-300", topics: ["DSA", "Machine Coding", "System Design", "Graphs"], rounds: ["OA", "Machine Coding", "DSA", "System Design", "Culture"] },
  { name: "Zomato", type: "Product", difficulty: "Medium", ctc: "14–26 LPA", coverage: "High", logo: "Z", gradient: "from-red-500 to-pink-400", topics: ["DSA", "System Design", "DBMS", "Web Dev"], rounds: ["OA", "Technical (2)", "Manager Round"] },
  { name: "HCL", type: "Service", difficulty: "Easy", ctc: "3.5–6 LPA", coverage: "High", logo: "H", gradient: "from-blue-700 to-blue-500", topics: ["Aptitude", "OOP", "DBMS", "OS", "CN"], rounds: ["Online Test", "Technical", "HR"] },
  { name: "Tech Mahindra", type: "Service", difficulty: "Medium", ctc: "3.5–6 LPA", coverage: "High", logo: "TM", gradient: "from-pink-600 to-pink-400", topics: ["Aptitude", "OOP", "DBMS", "DSA"], rounds: ["Online Test", "Technical", "HR"] },
  { name: "Capgemini", type: "Service", difficulty: "Medium", ctc: "4–7 LPA", coverage: "High", logo: "Ca", gradient: "from-teal-600 to-teal-400", topics: ["Aptitude", "DBMS", "OOP", "System Design"], rounds: ["Game-Based Test", "Technical", "HR"] },
];

export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Service" | "Product">("All");
  const [diffFilter, setDiffFilter] = useState<"All" | "Easy" | "Medium" | "Hard">("All");

  // ─── Semantic Search States ───
  const [companiesList, setCompaniesList] = useState(companies);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (val: string) => {
    setSearch(val);
    if (!val.trim()) {
      setCompaniesList(companies);
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/search?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (data.success) {
        setCompaniesList(data.companies);
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error("Semantic search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExploreCompany = (compName: string) => {
    handleSearch(compName);
    setTimeout(() => {
      document.getElementById("company-search-input")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const filtered = companiesList.filter((c) => {
    const matchesType = filter === "All" || c.type === filter;
    const matchesDiff = diffFilter === "All" || c.difficulty === diffFilter;
    return matchesType && matchesDiff;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Companies</h1>
        <p className="text-gray-400 mt-1">
          AI-powered interview prep covering 18 companies with RAG-enhanced question banks.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Semantic Search */}
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {loading ? (
              <svg className="w-5 h-5 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            )}
          </div>
          <input
            id="company-search-input"
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder='Try: "linked list questions at Google" — Semantic search'
            className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-primary-500/50 transition-colors"
          />
        </div>

        {/* Type filter */}
        <div className="flex gap-2">
          {(["All", "Service", "Product"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                filter === type
                  ? "gradient-bg text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Difficulty filter */}
        <div className="flex gap-2">
          {(["All", "Easy", "Medium", "Hard"] as const).map((diff) => (
            <button
              key={diff}
              onClick={() => setDiffFilter(diff)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                diffFilter === diff
                  ? diff === "Easy" ? "bg-success-500/20 text-success-400"
                    : diff === "Medium" ? "bg-warning-500/20 text-warning-400"
                    : diff === "Hard" ? "bg-error-500/20 text-error-400"
                    : "gradient-bg text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Semantic Search Matches Section */}
      {searchResults.length > 0 && (
        <div className="space-y-3 animate-scale-in">
          <h2 className="text-sm font-bold text-primary-400 uppercase tracking-wider">
            Semantic Database Matches ({searchResults.length})
          </h2>
          <div className="grid gap-3">
            {searchResults.map((res: any, idx: number) => {
              const compName = res.metadata?.company || "Company";
              return (
                <div key={idx} className="glass-card rounded-xl p-5 border border-primary-500/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase bg-primary-500/15 text-primary-400 px-2 py-0.5 rounded">
                      {compName}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      match relevance: {(res.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{res.content}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Companies Grid */}
      <div>
        {searchResults.length > 0 && (
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
            Matching Companies
          </h2>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((company) => (
            <div
              key={company.name}
              onClick={() => handleExploreCompany(company.name)}
              className="glass-card rounded-xl p-5 group cursor-pointer hover:border-primary-500/30 hover:bg-white/[0.02] transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${company.gradient} flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform`}>
                  {company.logo}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    company.type === "Product" ? "bg-accent-500/20 text-accent-400" : "bg-primary-500/20 text-primary-400"
                  }`}>
                    {company.type}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    company.difficulty === "Easy" ? "bg-success-500/20 text-success-400"
                      : company.difficulty === "Medium" ? "bg-warning-500/20 text-warning-400"
                      : "bg-error-500/20 text-error-400"
                  }`}>
                    {company.difficulty}
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white group-hover:text-primary-400 transition-colors">
                {company.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">Avg CTC: {company.ctc}</p>

              {/* Topics */}
              <div className="flex flex-wrap gap-1 mt-3">
                {company.topics.slice(0, 4).map((t) => (
                  <span key={t} className="text-[10px] font-medium bg-white/5 text-gray-400 px-1.5 py-0.5 rounded">{t}</span>
                ))}
                {company.topics.length > 4 && <span className="text-[10px] text-gray-600">+{company.topics.length - 4}</span>}
              </div>

              {/* Rounds & Explore */}
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-gray-500">
                  {company.rounds.length} rounds • {company.coverage} coverage
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExploreCompany(company.name);
                  }}
                  className="text-xs text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1 transition-colors"
                >
                  Explore
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No companies match your filters.</p>
          <button onClick={() => { setSearch(""); setFilter("All"); setDiffFilter("All"); setCompaniesList(companies); setSearchResults([]); }} className="text-primary-400 text-sm mt-2">
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
