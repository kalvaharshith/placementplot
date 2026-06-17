"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface DocumentItem {
  id: string;
  content: string;
  metadata: Record<string, any>;
  kb_type: string;
  created_at: string;
}

const kbTypeOptions = [
  { value: "interview_bank", label: "Interview Bank (Q&As)" },
  { value: "company_profiles", label: "Company Profiles" },
  { value: "ats_rules", label: "ATS Rules" },
  { value: "resume_examples", label: "Resume Examples" },
  { value: "learning_resources", label: "Learning Roadmaps" },
];

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ─── Stats States ───
  const [stats, setStats] = useState<{
    users: number;
    resumes: number;
    interviews: number;
    documents: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // ─── Form Fields ───
  const [kbType, setKbType] = useState("interview_bank");
  const [content, setContent] = useState("");

  // Metadata sub-fields
  const [company, setCompany] = useState("");
  const [round, setRound] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [topic, setTopic] = useState("");
  const [source, setSource] = useState("");
  const [url, setUrl] = useState("");
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");

  // ─── Recent Documents ───
  const [recentDocs, setRecentDocs] = useState<DocumentItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const loadAdminStats = async (token: string) => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/stats", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load admin stats", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (user) {
          setUserToken(session.access_token);
          const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "kalvaharshith@gmail.com";
          if (user.email === adminEmail) {
            setAuthorized(true);
            loadRecentDocuments();
            loadAdminStats(session.access_token);
          } else {
            setAuthorized(false);
          }
        } else {
          setAuthorized(false);
        }
      } catch (err) {
        setAuthorized(false);
      }
    };

    checkAdminSession();
  }, []);

  const loadRecentDocuments = async () => {
    setLoadingRecent(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("id, content, metadata, kb_type, created_at")
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) throw error;
      setRecentDocs(data || []);
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !userToken) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    // Build metadata payload based on selected segment type
    const metadata: Record<string, any> = {};
    if (kbType === "interview_bank") {
      if (company) metadata.company = company.toLowerCase().trim();
      if (round) metadata.round = round.trim();
      if (difficulty) metadata.difficulty = difficulty;
      if (topic) metadata.topic = topic.toLowerCase().trim();
    } else if (kbType === "company_profiles") {
      if (company) metadata.company = company.toLowerCase().trim();
      if (round) metadata.round = round.trim();
      if (topic) metadata.topic = topic.toLowerCase().trim();
    } else if (kbType === "ats_rules") {
      if (topic) metadata.topic = topic.toLowerCase().trim();
      if (source) metadata.source = source.trim();
    } else if (kbType === "resume_examples") {
      if (role) metadata.role = role.toLowerCase().trim();
      if (industry) metadata.industry = industry.trim();
    } else if (kbType === "learning_resources") {
      if (topic) metadata.topic = topic.toLowerCase().trim();
      if (source) metadata.source = source.trim();
      if (url) metadata.url = url.trim();
    }

    try {
      const res = await fetch("/api/admin/upload-resource", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          kbType,
          content,
          metadata,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload");

      setSuccessMsg("Document embedded and indexed successfully!");
      setContent("");
      // Reset form variables
      setCompany("");
      setRound("");
      setTopic("");
      setSource("");
      setUrl("");
      setRole("");
      setIndustry("");

      loadRecentDocuments();
      loadAdminStats(userToken);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload document.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!userToken) return;
    if (!confirm("Are you sure you want to delete this resource from the vector store?")) return;

    try {
      const res = await fetch("/api/admin/delete-resource", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      loadRecentDocuments();
      loadAdminStats(userToken);
    } catch (err: any) {
      alert(err.message || "Failed to delete resource");
    }
  };

  // Access check state loader
  if (authorized === null) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
        <svg className="w-8 h-8 text-primary-400 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
          <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <p className="text-sm text-gray-500 mt-2">Checking administrative credentials...</p>
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center max-w-md mx-auto p-8 glass-card border-error-500/20 rounded-2xl animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-error-500/10 flex items-center justify-center text-error-400 mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          You do not have permission to view this page. Restricted to portal administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
          <svg className="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          Admin Resource Portal
        </h1>
        <p className="text-gray-400 mt-1">
          Upload and index knowledge base content into the Supabase vector store via Gemini.
        </p>
      </div>

      {/* System Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Users",
            value: stats ? stats.users : "...",
            color: "text-blue-400 border-blue-500/20 bg-blue-500/5",
            desc: "Registered user profiles",
            icon: (
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ),
          },
          {
            label: "Resumes Analyzed",
            value: stats ? stats.resumes : "...",
            color: "text-purple-400 border-purple-500/20 bg-purple-500/5",
            desc: "Total uploads processed",
            icon: (
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ),
          },
          {
            label: "Mock Interviews",
            value: stats ? stats.interviews : "...",
            color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
            desc: "AI sessions completed",
            icon: (
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            ),
          },
          {
            label: "Vector Documents",
            value: stats ? stats.documents : "...",
            color: "text-amber-400 border-amber-500/20 bg-amber-500/5",
            desc: "Embedded RAG chunks",
            icon: (
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            ),
          },
        ].map((card) => (
          <div key={card.label} className={`glass-card rounded-xl p-5 border ${card.color}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{card.label}</span>
              {card.icon}
            </div>
            <p className="text-3xl font-extrabold text-white">{card.value}</p>
            <p className="text-[11px] text-gray-500 mt-1">{card.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        {/* Left Form Panel */}
        <div className="lg:col-span-3 glass-card rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white mb-2 pb-2 border-b border-white/5">Upload Resource</h2>

          {successMsg && (
            <div className="p-4 bg-success-500/10 border border-success-500/20 text-success-400 text-sm rounded-xl text-center">
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-error-500/10 border border-error-500/20 text-error-400 text-sm rounded-xl text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Segment Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {kbTypeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setKbType(opt.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      kbType === opt.value
                        ? "bg-primary-500/10 border-primary-500/30 text-primary-400"
                        : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic fields */}
            <div className="grid sm:grid-cols-2 gap-4 bg-white/[0.01] p-4 rounded-xl border border-white/5">
              {(kbType === "interview_bank" || kbType === "company_profiles") && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase tracking-wider">Company</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. TCS, Google"
                      className="w-full px-3.5 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-700 outline-none focus:border-primary-500/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase tracking-wider">Round</label>
                    <input
                      type="text"
                      value={round}
                      onChange={(e) => setRound(e.target.value)}
                      placeholder="e.g. Technical, HR, DSA"
                      className="w-full px-3.5 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-700 outline-none focus:border-primary-500/30"
                      required
                    />
                  </div>
                </>
              )}

              {kbType === "interview_bank" && (
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase tracking-wider">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3.5 py-2 bg-surface-900 border border-white/10 rounded-lg text-sm text-gray-300 outline-none focus:border-primary-500/30"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              )}

              {(kbType === "interview_bank" || kbType === "company_profiles" || kbType === "ats_rules" || kbType === "learning_resources") && (
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase tracking-wider">Topic</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. OOP, Keywords, Trees"
                    className="w-full px-3.5 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-700 outline-none focus:border-primary-500/30"
                  />
                </div>
              )}

              {kbType === "resume_examples" && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase tracking-wider">Role</label>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. SDE, Data Analyst"
                      className="w-full px-3.5 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-700 outline-none focus:border-primary-500/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase tracking-wider">Industry / Tier</label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. FAANG, FinTech"
                      className="w-full px-3.5 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-700 outline-none focus:border-primary-500/30"
                    />
                  </div>
                </>
              )}

              {(kbType === "ats_rules" || kbType === "learning_resources") && (
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase tracking-wider">Source</label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g. GeeksforGeeks, YouTube channel"
                    className="w-full px-3.5 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-700 outline-none focus:border-primary-500/30"
                  />
                </div>
              )}

              {kbType === "learning_resources" && (
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase tracking-wider">URL / Reference Link</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="e.g. https://youtube.com/..."
                    className="w-full px-3.5 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-700 outline-none focus:border-primary-500/30"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Resource Content (Text)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste the document text content that will be vectorized and stored here..."
                rows={8}
                className="w-full p-4 bg-white/[0.02] border border-white/10 rounded-xl text-sm font-mono text-gray-300 placeholder-gray-700 outline-none focus:border-primary-500/50 resize-y leading-relaxed"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="w-full btn-primary py-3"
            >
              <span className="flex items-center justify-center gap-2">
                {loading && (
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                    <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                )}
                {loading ? "Embedding and indexing in Vector DB..." : "Index Resource"}
              </span>
            </button>
          </form>
        </div>

        {/* Right Recent Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Recently Uploaded</h2>
            <button
              onClick={loadRecentDocuments}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Refresh list"
              disabled={loadingRecent}
            >
              <svg className={`w-4 h-4 ${loadingRecent ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            {recentDocs.length === 0 ? (
              <div className="p-6 glass-card rounded-xl text-center border border-white/5">
                <p className="text-xs text-gray-500">No resources found in index.</p>
              </div>
            ) : (
              recentDocs.map((doc) => {
                const badgeColorMap: Record<string, string> = {
                  interview_bank: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                  company_profiles: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                  ats_rules: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                  resume_examples: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                  learning_resources: "bg-rose-500/10 text-rose-400 border-rose-500/20",
                };

                return (
                  <div key={doc.id} className="glass-card rounded-xl p-4 border border-white/5 relative group hover:border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold tracking-wider uppercase ${badgeColorMap[doc.kb_type] || "bg-white/5 text-gray-400 border-white/10"}`}>
                        {doc.kb_type.replace("_", " ")}
                      </span>

                      {/* Delete Action button */}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 rounded hover:bg-red-500/10 transition-all cursor-pointer"
                        title="Delete resource from vector DB"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <p className="text-xs text-gray-300 line-clamp-3 mb-2 leading-relaxed font-sans">{doc.content}</p>

                    {/* Metadata tags */}
                    {Object.keys(doc.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/5">
                        {Object.entries(doc.metadata).map(([k, v]) => (
                          <span key={k} className="text-[10px] font-mono text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
