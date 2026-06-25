"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";

/* ───────── Upload Dropzone ───────── */
function Dropzone({ onFile }: { onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.type === "application/pdf" || file.name.endsWith(".docx"))) {
        onFile(file);
      }
    },
    [onFile]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
        dragging
          ? "border-primary-500 bg-primary-500/5"
          : "border-white/10 hover:border-primary-500/50 hover:bg-white/[0.02]"
      }`}
    >
      <input
        type="file"
        accept=".pdf,.docx"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mb-4 animate-bounce-gentle">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-white mb-1">
          Drop your resume here
        </p>
        <p className="text-sm text-gray-500 mb-4">
          or click to browse • PDF, DOCX supported
        </p>
        <span className="inline-block text-xs bg-primary-500/10 text-primary-400 px-3 py-1 rounded-full">
          RAG-powered analysis
        </span>
      </div>
    </div>
  );
}

/* ───────── Score Category ───────── */
function ScoreCategory({ name, score, maxScore = 100 }: { name: string; score: number; maxScore?: number }) {
  const pct = (score / maxScore) * 100;
  const color = pct >= 80 ? "bg-success-500" : pct >= 60 ? "bg-warning-500" : "bg-error-500";
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-300">{name}</span>
        <span className="text-white font-semibold">{score}/{maxScore}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ───────── Suggestion Card ───────── */
function SuggestionCard({ type, title, description, example }: {
  type: "critical" | "warning" | "tip";
  title: string;
  description: string;
  example?: string;
}) {
  const styles = {
    critical: { border: "border-error-500/30", bg: "bg-error-500/5", badge: "bg-error-500/20 text-error-400", label: "Critical" },
    warning: { border: "border-warning-500/30", bg: "bg-warning-500/5", badge: "bg-warning-500/20 text-warning-400", label: "Improve" },
    tip: { border: "border-primary-500/30", bg: "bg-primary-500/5", badge: "bg-primary-500/20 text-primary-400", label: "Tip" },
  };
  const s = styles[type];

  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${s.badge}`}>{s.label}</span>
        <h4 className="text-sm font-semibold text-white">{title}</h4>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
      {example && (
        <div className="mt-3 p-3 bg-white/[0.03] rounded-lg border border-white/5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Example from top resumes</p>
          <p className="text-xs text-gray-300 italic">&ldquo;{example}&rdquo;</p>
        </div>
      )}
    </div>
  );
}

import PaymentButton from "@/features/payment/PaymentButton";

/* ───────── Main Page ───────── */
export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<any | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // DB History States
  const [pastResumes, setPastResumes] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadPastResumes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("resumes")
        .select("file_name, ats_score, created_at, analysis")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPastResumes(data || []);
    } catch (err) {
      console.error("Error loading past resumes:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadPastResumes();
  }, []);

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (jobDescription) {
        formData.append("jobDescription", jobDescription);
      }

      const res = await fetch("/api/resume/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errorMsg = "Failed to analyze resume.";
        try {
          const text = await res.text();
          try {
            const errorData = JSON.parse(text);
            errorMsg = errorData.error || errorMsg;
          } catch {
            if (text.includes("413") || text.toLowerCase().includes("too large")) {
              errorMsg = "The file is too large. Please upload a smaller PDF resume (under 4MB).";
            } else {
              errorMsg = `Server error (Status ${res.status}). Please try again later.`;
            }
          }
        } catch {
          errorMsg = `Server returned an unexpected response (Status ${res.status}).`;
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to analyze resume.");
      }

      setAnalysisData(data.analysis);

      // Save to Supabase DB
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("resumes").insert({
            user_id: user.id,
            file_name: file.name,
            ats_score: data.analysis.overallScore,
            analysis: data.analysis,
            job_description: jobDescription || null,
          });
          loadPastResumes();
        }
      } catch (dbErr) {
        console.error("Error saving resume analysis to DB:", dbErr);
      }

    } catch (err: any) {
      setError(err.message || "An error occurred during analysis. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (analysisData) {
    // Determine the circumference-related calculations for dynamic ring gauge SVG
    const overallScore = analysisData.overallScore || 0;
    const strokeDashoffset = Math.max(0, 352 - (352 * overallScore) / 100);

    return (
      <div className="space-y-6 animate-fade-in max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Resume Analysis</h1>
            <p className="text-sm text-gray-500 mt-1">{file?.name} • Analyzed just now</p>
          </div>
          <button
            onClick={() => {
              setAnalysisData(null);
              setFile(null);
              setJobDescription("");
            }}
            className="btn-secondary text-sm px-4 py-2"
          >
            Analyze Another
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Score Overview */}
          <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <div className="relative w-32 h-32 mb-4">
              <svg className="-rotate-90" width="128" height="128" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="url(#atsGrad)"
                  strokeWidth="12"
                  strokeDasharray="352"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="atsGrad" x1="0%" y1="0%" x2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-white">{overallScore}</span>
                <span className="text-xs text-gray-500">/100</span>
              </div>
            </div>
            <p className="text-lg font-semibold text-white">
              {overallScore >= 80 ? "Excellent!" : overallScore >= 65 ? "Good Job!" : "Needs Improvement"}
            </p>
            <p className="text-xs text-gray-500 text-center mt-1 max-w-[200px]">
              {analysisData.summary || "Summary of ATS scoring results and recommendations."}
            </p>
          </div>

          {/* Category Breakdown */}
          <div className="lg:col-span-2 glass-card rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">Score Breakdown</h3>
            <ScoreCategory name="📝 Formatting & Structure" score={analysisData.scores?.structure?.score ?? 0} />
            <ScoreCategory name="🔑 Keyword Alignment" score={analysisData.scores?.keywords?.score ?? 0} />
            <ScoreCategory name="💡 Impact & Quantification" score={analysisData.scores?.impact?.score ?? 0} />
            <ScoreCategory name="📊 Consistency" score={analysisData.scores?.consistency?.score ?? 0} />
            <ScoreCategory name="🎯 ATS Compatibility" score={analysisData.scores?.formatting?.score ?? 0} />
            <ScoreCategory name="📋 Relevance to Role" score={analysisData.scores?.relevance?.score ?? 0} />
          </div>
        </div>

        {/* Strengths & Key Findings */}
        {analysisData.strengths && analysisData.strengths.length > 0 && (
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-base font-semibold text-white mb-3">Key Strengths</h3>
            <ul className="grid sm:grid-cols-2 gap-3">
              {analysisData.strengths.map((str: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <svg className="w-5 h-5 text-success-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {str}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            RAG-Powered Suggestions
            <span className="ml-2 text-xs font-normal text-gray-500">Grounded in real ATS rules</span>
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {analysisData.suggestions && analysisData.suggestions.length > 0 ? (
              analysisData.suggestions.map((sug: any, i: number) => (
                <SuggestionCard
                  key={i}
                  type={sug.priority === "high" ? "critical" : sug.priority === "medium" ? "warning" : "tip"}
                  title={sug.issue || sug.category}
                  description={sug.suggestion}
                  example={sug.example}
                />
              ))
            ) : (
              <p className="text-gray-400 text-sm col-span-2">No critical suggestions found! Your resume looks excellent.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Resume Analyzer</h1>
        <p className="text-gray-400 mt-1">
          Get an ATS compatibility score powered by our RAG knowledge base of real ATS rules.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-error-500/10 border border-error-500/20 text-error-400 text-sm rounded-xl animate-shake">
          {error}
        </div>
      )}

      {/* Credits */}
      <div className="glass-card rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {loadingHistory ? "Loading..." : `${pastResumes.length} resume${pastResumes.length !== 1 ? "s" : ""} analyzed`}
            </p>
            <p className="text-xs text-gray-500">RAG-powered ATS analysis</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-500/10 text-primary-400 border border-primary-500/20">
          AI Powered
        </span>
      </div>

      {/* Upload */}
      <Dropzone onFile={setFile} />

      {file && (
        <div className="glass-card rounded-xl p-4 flex items-center justify-between animate-scale-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button onClick={() => setFile(null)} className="text-gray-500 hover:text-error-400 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Job Description (optional) */}
      <div>
        <label className="text-sm font-medium text-gray-300 block mb-2">
          Target Job Description <span className="text-gray-600">(optional — improves keyword matching)</span>
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste a job description here for targeted ATS analysis..."
          className="w-full h-32 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-primary-500/50 resize-none transition-colors"
        />
      </div>

      {/* Analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={!file || analyzing}
        className={`w-full py-4 rounded-xl font-semibold text-sm transition-all ${
          file && !analyzing
            ? "btn-primary"
            : "bg-white/5 text-gray-600 cursor-not-allowed"
        }`}
      >
        <span className="flex items-center justify-center gap-2">
          {analyzing ? (
            <>
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Analyzing with RAG...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Analyze Resume
            </>
          )}
        </span>
      </button>

      {/* History */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Past Analyses</h2>
        {loadingHistory ? (
          <div className="text-sm text-gray-500 py-4 text-center">Loading past analyses...</div>
        ) : pastResumes.length > 0 ? (
          <div className="space-y-3">
            {pastResumes.map((item) => (
              <div
                key={item.created_at}
                onClick={() => {
                  setFile(new File([], item.file_name));
                  setAnalysisData(item.analysis);
                }}
                className="glass-card rounded-xl p-4 flex items-center justify-between group cursor-pointer hover:border-primary-500/20 hover:bg-white/[0.01] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-primary-400 transition-colors">{item.file_name}</p>
                    <p className="text-xs text-gray-500">{timeAgo(item.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${item.ats_score >= 80 ? "text-success-400" : "text-warning-400"}`}>
                    {item.ats_score}
                  </span>
                  <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 py-6 border border-dashed border-white/10 rounded-xl text-center">
            No past analyses yet. Upload a resume to get started!
          </div>
        )}
      </div>
    </div>
  );
}
