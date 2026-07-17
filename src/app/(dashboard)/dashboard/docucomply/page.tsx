"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";

/* ───────── Upload Dropzone ───────── */
function Dropzone({ onFile, disabled }: { onFile: (f: File) => void; disabled?: boolean }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") {
        onFile(file);
      }
    },
    [onFile, disabled]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
        disabled ? "opacity-50 cursor-not-allowed" :
        dragging
          ? "border-emerald-500 bg-emerald-500/5 cursor-pointer"
          : "border-white/10 hover:border-emerald-500/50 hover:bg-white/[0.02] cursor-pointer"
      }`}
    >
      <input
        type="file"
        accept=".pdf"
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <div className="flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className="text-base font-semibold text-white mb-1">
          Upload a document for Q&A
        </p>
        <p className="text-sm text-gray-500 mb-3">
          PDF supported • PII auto-redacted before indexing
        </p>
        <span className="inline-block text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full">
          🛡️ PII-safe RAG pipeline
        </span>
      </div>
    </div>
  );
}

/* ───────── PII Badge ───────── */
function PIIBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    email: "bg-blue-500/15 text-blue-400",
    phone: "bg-purple-500/15 text-purple-400",
    ssn: "bg-red-500/15 text-red-400",
    aadhaar: "bg-orange-500/15 text-orange-400",
    pan: "bg-amber-500/15 text-amber-400",
    credit_card: "bg-red-500/15 text-red-400",
    date_of_birth: "bg-teal-500/15 text-teal-400",
    ip_address: "bg-gray-500/15 text-gray-400",
    passport: "bg-indigo-500/15 text-indigo-400",
    bank_account: "bg-yellow-500/15 text-yellow-400",
    drivers_license: "bg-cyan-500/15 text-cyan-400",
  };

  const labels: Record<string, string> = {
    email: "Email", phone: "Phone", ssn: "SSN", aadhaar: "Aadhaar",
    pan: "PAN", credit_card: "Credit Card", date_of_birth: "DOB",
    ip_address: "IP", passport: "Passport", bank_account: "Bank Acc",
    drivers_license: "DL",
  };

  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors[type] || "bg-white/10 text-gray-400"}`}>
      {labels[type] || type}
    </span>
  );
}

/* ───────── Document Card ───────── */
function DocumentCard({ doc, onDelete }: {
  doc: { id: string; file_name: string; chunk_count: number; pii_types_found: string[]; pii_redaction_count: number; status: string; created_at: string };
  onDelete: (id: string) => void;
}) {
  const statusColors: Record<string, string> = {
    indexed: "text-emerald-400",
    processing: "text-amber-400 animate-pulse",
    failed: "text-red-400",
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{doc.file_name}</p>
            <p className="text-xs text-gray-500">{timeAgo(doc.created_at)} • {doc.chunk_count} chunks</p>
          </div>
        </div>
        <button
          onClick={() => onDelete(doc.id)}
          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-1"
          title="Delete document"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-semibold uppercase ${statusColors[doc.status] || "text-gray-400"}`}>
          {doc.status === "indexed" ? "✓ Indexed" : doc.status === "processing" ? "⏳ Processing" : "✗ Failed"}
        </span>
        {doc.pii_redaction_count > 0 && (
          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
            🛡️ {doc.pii_redaction_count} PII redacted
          </span>
        )}
      </div>

      {doc.pii_types_found && doc.pii_types_found.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {doc.pii_types_found.map((type) => (
            <PIIBadge key={type} type={type} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── Source Citation ───────── */
function SourceCitation({ source }: {
  source: { sourceIndex: number; fileName: string; relevance: number; preview: string };
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded">
          Source {source.sourceIndex}
        </span>
        <span className="text-xs text-gray-400 truncate">{source.fileName}</span>
        <span className="text-[10px] text-gray-500 ml-auto shrink-0">{source.relevance}% match</span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{source.preview}</p>
    </div>
  );
}

/* ───────── Main Page ───────── */
export default function DocuComplyPage() {
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Documents state
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Q&A state
  const [question, setQuestion] = useState("");
  const [querying, setQuerying] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [questionRedacted, setQuestionRedacted] = useState(false);

  // Chat history
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; content: string; sources?: any[] }[]>([]);

  // ── Load user documents ──
  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setLoadingDocs(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setDocuments(data || []);
    } catch {
      // Ignore — table may not exist yet
    } finally {
      setLoadingDocs(false);
    }
  }

  // ── Upload handler ──
  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);

      const res = await fetch("/api/docucomply/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Upload failed");
        return;
      }

      setUploadResult(data);
      loadDocuments();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // ── Delete handler ──
  async function handleDelete(docId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete document chunks from the documents table
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

      // Delete the user_documents record (chunks will need to be cleaned via service role)
      await supabase
        .from("user_documents")
        .delete()
        .eq("id", docId)
        .eq("user_id", user.id);

      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      // Silently fail
    }
  }

  // ── Query handler ──
  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || querying) return;

    const userQuestion = question.trim();
    setQuestion("");
    setQuerying(true);
    setQueryError(null);
    setAnswer(null);
    setSources([]);

    // Add user message to chat
    setChatHistory((prev) => [...prev, { role: "user", content: userQuestion }]);

    try {
      const res = await fetch("/api/docucomply/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userQuestion }),
      });

      const data = await res.json();

      if (!res.ok) {
        setQueryError(data.error || "Query failed");
        return;
      }

      setAnswer(data.answer);
      setSources(data.sources || []);
      setQuestionRedacted(data.questionRedacted || false);

      // Add AI response to chat
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", content: data.answer, sources: data.sources },
      ]);
    } catch (err: any) {
      setQueryError(err.message || "Query failed");
    } finally {
      setQuerying(false);
    }
  }

  const indexedDocs = documents.filter((d) => d.status === "indexed");
  const totalChunks = documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0);
  const totalRedactions = documents.reduce((sum, d) => sum + (d.pii_redaction_count || 0), 0);

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </span>
          DocuComply
        </h1>
        <p className="text-gray-400 mt-1">
          Upload documents, auto-redact PII, and ask questions — all powered by your PlacementPlot RAG engine.
        </p>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Documents", value: indexedDocs.length, icon: "📄" },
          { label: "Chunks Indexed", value: totalChunks, icon: "🧩" },
          { label: "PII Redacted", value: totalRedactions, icon: "🛡️" },
          { label: "Questions Asked", value: chatHistory.filter((c) => c.role === "user").length, icon: "💬" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-lg mb-1">{stat.icon}</div>
            <div className="text-xl font-bold text-white">{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* ── Left Column: Upload + Documents ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
              Upload Document
            </h2>
            <Dropzone onFile={handleUpload} disabled={uploading} />

            {uploading && (
              <div className="mt-4 flex items-center gap-3 text-sm text-emerald-400">
                <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                Processing document — redacting PII, chunking, embedding...
              </div>
            )}

            {uploadError && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {uploadError}
              </div>
            )}

            {uploadResult && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <p className="text-sm font-semibold text-emerald-400">✓ Document indexed successfully</p>
                <p className="text-xs text-gray-400">{uploadResult.chunks} chunks created from &ldquo;{uploadResult.fileName}&rdquo;</p>
                {uploadResult.redaction?.totalRedacted > 0 && (
                  <div className="text-xs text-amber-400 bg-amber-500/10 rounded-lg p-2">
                    🛡️ {uploadResult.redaction.summary}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Document List */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
              Your Documents
              <span className="text-xs text-gray-500 font-normal ml-auto">{documents.length}/20</span>
            </h2>

            {loadingDocs ? (
              <div className="text-center py-8 text-gray-500 text-sm">Loading documents...</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">No documents uploaded yet.</p>
                <p className="text-gray-600 text-xs mt-1">Upload a PDF above to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Q&A Chat ── */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 flex flex-col" style={{ minHeight: "600px" }}>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
              Ask Your Documents
            </h2>

            {/* Chat Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto mb-4 pr-1" style={{ maxHeight: "450px" }}>
              {chatHistory.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-sm">Upload documents and ask questions about them.</p>
                  <p className="text-gray-600 text-xs mt-1">Your data stays private — PII is redacted before processing.</p>
                </div>
              )}

              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-emerald-500/15 border border-emerald-500/20 text-white"
                      : "bg-white/[0.03] border border-white/[0.06] text-gray-300"
                  }`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Sources</p>
                        {msg.sources.map((src: any, j: number) => (
                          <SourceCitation key={j} source={src} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {querying && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      Searching your documents...
                    </div>
                  </div>
                </div>
              )}

              {queryError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  {queryError}
                </div>
              )}
            </div>

            {/* Question redaction notice */}
            {questionRedacted && (
              <div className="mb-3 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-1.5">
                🛡️ PII was detected and redacted from your question before processing.
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleQuery} className="flex gap-3">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={indexedDocs.length > 0 ? "Ask a question about your documents..." : "Upload a document first..."}
                disabled={querying || indexedDocs.length === 0}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={querying || !question.trim() || indexedDocs.length === 0}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {querying ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Ask"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
