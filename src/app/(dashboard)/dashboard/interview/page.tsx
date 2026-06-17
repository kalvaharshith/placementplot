"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";

/* ───────── Types ───────── */
interface Message {
  role: "ai" | "user";
  content: string;
  timestamp: string;
}

/* ───────── Interview Config ───────── */
const companyOptions = ["TCS", "Infosys", "Wipro", "Google", "Microsoft", "Amazon", "Adobe", "Goldman Sachs", "Flipkart", "Cognizant"];
const roundOptions = ["Technical", "HR", "Behavioral", "DSA", "System Design"];
const difficultyOptions = ["Easy", "Medium", "Hard"];

/* ───────── Code Scratchpad Templates ───────── */
const codeTemplates: Record<string, string> = {
  javascript: `// JavaScript Scratchpad\n\nfunction solve(input) {\n  // Write your solution here\n  console.log("Input:", input);\n  return null;\n}\n\n// Test execution\nconst result = solve("test");\nconsole.log("Result:", result);`,
  python: `# Python Scratchpad\n\ndef solve(input_val):\n    # Write your solution here\n    print(f"Input: {input_val}")\n    return None\n\n# Test execution\nresult = solve("test")\nprint(f"Result: {result}")`,
  cpp: `// C++ Scratchpad\n#include <iostream>\n#include <vector>\n#include <string>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve(string input) {\n        // Write your solution here\n        cout << "Input: " << input << endl;\n    }\n};\n\nint main() {\n    Solution s;\n    s.solve("test");\n    return 0;\n}`,
  java: `// Java Scratchpad\nimport java.util.*;\n\npublic class Solution {\n    public static void solve(String input) {\n        // Write your solution here\n        System.out.println("Input: " + input);\n    }\n\n    public static void main(String[] args) {\n        solve("test");\n    }\n}`
};

/* ───────── Config Card ───────── */
function ConfigCard({ label, options, selected, onSelect }: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-300 block mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              selected === opt
                ? "gradient-bg text-white shadow-lg shadow-primary-500/20"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────── Chat Message ───────── */
function ChatMessage({ message }: { message: Message }) {
  return (
    <div className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
        message.role === "ai"
          ? "gradient-bg text-white"
          : "bg-white/10 text-gray-300"
      }`}>
        {message.role === "ai" ? "AI" : "U"}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
        message.role === "ai"
          ? "glass-card"
          : "bg-primary-500/20 border border-primary-500/20"
      }`}>
        <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <p className="text-[10px] text-gray-600 mt-1">{message.timestamp}</p>
      </div>
    </div>
  );
}

/* ───────── Main Page ───────── */
export default function InterviewPage() {
  const [company, setCompany] = useState("TCS");
  const [round, setRound] = useState("Technical");
  const [difficulty, setDifficulty] = useState("Medium");
  const [started, setStarted] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);

  // ─── Live API States ───
  const [systemPrompt, setSystemPrompt] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<any | null>(null);

  // DB History States
  const [pastInterviews, setPastInterviews] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadPastInterviews = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("mock_interviews")
        .select("id, company, round, score, created_at, feedback, messages, difficulty")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPastInterviews(data || []);
    } catch (err) {
      console.error("Error loading past interviews:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadPastInterviews();
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  // ─── Real-Time Added States ───
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds
  const [code, setCode] = useState(codeTemplates.javascript);
  const [codeLang, setCodeLang] = useState("javascript");
  const [fontSize, setFontSize] = useState(14);
  const [recognition, setRecognition] = useState<any>(null);

  // ─── Refs for avoiding stale closures ───
  const messagesRef = useRef<Message[]>([]);
  const voiceEnabledRef = useRef(false);
  const utteranceQueue = useRef<SpeechSynthesisUtterance[]>([]);
  const isSpeakingRef = useRef(false);
  const spokenTextRef = useRef("");
  const accumulatedTextRef = useRef("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
    if (!voiceEnabled) {
      stopSpeaking();
    }
  }, [voiceEnabled]);

  const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // ─── TTS Speech Synthesis Functions ───
  const stopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceQueue.current = [];
    isSpeakingRef.current = false;
  };

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Filter code blocks and RAG tagging markers
    const cleanText = text
      .replace(/```[\s\S]*?```/g, "[code snippet omitted in speech]")
      .replace(/\[FROM KNOWLEDGE BASE\]/g, "")
      .replace(/\[FOLLOW-UP\]/g, "")
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith("en-IN") || v.lang.startsWith("en-GB") || v.lang.startsWith("en-US")
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onend = () => {
      isSpeakingRef.current = false;
      processQueue();
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      processQueue();
    };

    utteranceQueue.current.push(utterance);
    processQueue();
  };

  const processQueue = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (isSpeakingRef.current) return;
    if (utteranceQueue.current.length === 0) return;

    const nextUtterance = utteranceQueue.current.shift();
    if (nextUtterance) {
      isSpeakingRef.current = true;
      window.speechSynthesis.speak(nextUtterance);
    }
  };

  // ─── STT Speech Recognition Functions ───
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-IN";

        rec.onresult = (event: any) => {
          let finalTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setInput((prev) => {
              const trimmed = prev.trim();
              return trimmed ? `${trimmed} ${finalTranscript.trim()}` : finalTranscript.trim();
            });
          }
        };

        rec.onerror = (e: any) => {
          console.error("Speech recognition error:", e);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        setRecognition(rec);
      }
    }

    return () => {
      stopSpeaking();
    };
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.error("Mic start failed", err);
      }
    }
  };

  // ─── Countdown Timer Interval ───
  useEffect(() => {
    let interval: any = null;
    if (started && !evaluating && !evaluation) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            endAndEvaluateInterview();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [started, evaluating, evaluation]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ─── Start Interview (Streaming) ───
  const startInterview = async () => {
    setStarted(true);
    setEvaluation(null);
    setError(null);
    setMessages([]);
    setThinking(true);
    setTimeLeft(1800); // Reset timer to 30 mins
    stopSpeaking();
    spokenTextRef.current = "";
    accumulatedTextRef.current = "";

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          company,
          role: "SDE",
          round,
          difficulty,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to start interview.");
      }

      // Read custom system prompt metadata from headers
      const systemPromptBase64 = res.headers.get("x-system-prompt");
      const systemPromptStr = systemPromptBase64 ? atob(systemPromptBase64) : "";
      setSystemPrompt(systemPromptStr);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Could not initialize stream reader.");

      // Add dummy AI message first
      const initialMsg: Message = {
        role: "ai",
        content: "",
        timestamp: now(),
      };
      setMessages([initialMsg]);
      setThinking(false);

      let textAccumulator = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        textAccumulator += chunk;

        // Stream text into chat view
        setMessages((prev) => {
          const list = [...prev];
          if (list.length > 0) {
            list[list.length - 1] = {
              ...list[list.length - 1],
              content: textAccumulator,
            };
          }
          return list;
        });

        // TTS stream chunk reading
        accumulatedTextRef.current = textAccumulator;
        const unpaidText = accumulatedTextRef.current.slice(spokenTextRef.current.length);
        const sentences = unpaidText.split(/([.!?\n])/);
        let completeSentence = "";
        let lastIndex = 0;
        for (let i = 0; i < sentences.length - 1; i += 2) {
          const sentence = sentences[i] + (sentences[i + 1] || "");
          completeSentence += sentence;
          lastIndex += sentence.length;
        }

        if (completeSentence.trim() && voiceEnabledRef.current) {
          speakText(completeSentence);
          spokenTextRef.current += unpaidText.slice(0, lastIndex);
        }
      }

      // Flush final text
      const remainingText = accumulatedTextRef.current.slice(spokenTextRef.current.length);
      if (remainingText.trim() && voiceEnabledRef.current) {
        speakText(remainingText);
      }

    } catch (err: any) {
      setError(err.message || "Could not start interview.");
      setStarted(false);
    } finally {
      setThinking(false);
    }
  };

  // ─── Send Message (Streaming) ───
  const sendMessage = async () => {
    if (!input.trim() || thinking) return;

    if (isListening && recognition) {
      recognition.stop();
      setIsListening(false);
    }

    const userMsg: Message = { role: "user", content: input, timestamp: now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role === "ai" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      }));

      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "message",
          systemPrompt,
          history,
          message: input,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response.");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Could not initialize stream reader.");

      // Add dummy AI message to receive chunks
      const aiResponseMsg: Message = {
        role: "ai",
        content: "",
        timestamp: now(),
      };
      setMessages((prev) => [...prev, aiResponseMsg]);
      setThinking(false);

      stopSpeaking();
      spokenTextRef.current = "";
      accumulatedTextRef.current = "";

      let textAccumulator = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        textAccumulator += chunk;

        setMessages((prev) => {
          const list = [...prev];
          if (list.length > 0) {
            list[list.length - 1] = {
              ...list[list.length - 1],
              content: textAccumulator,
            };
          }
          return list;
        });

        // TTS stream chunk reading
        accumulatedTextRef.current = textAccumulator;
        const unpaidText = accumulatedTextRef.current.slice(spokenTextRef.current.length);
        const sentences = unpaidText.split(/([.!?\n])/);
        let completeSentence = "";
        let lastIndex = 0;
        for (let i = 0; i < sentences.length - 1; i += 2) {
          const sentence = sentences[i] + (sentences[i + 1] || "");
          completeSentence += sentence;
          lastIndex += sentence.length;
        }

        if (completeSentence.trim() && voiceEnabledRef.current) {
          speakText(completeSentence);
          spokenTextRef.current += unpaidText.slice(0, lastIndex);
        }
      }

      // Flush final text
      const remainingText = accumulatedTextRef.current.slice(spokenTextRef.current.length);
      if (remainingText.trim() && voiceEnabledRef.current) {
        speakText(remainingText);
      }

    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "I encountered a processing error. Let's proceed to the next question. Can you continue?",
          timestamp: now(),
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  // ─── Evaluate Interview ───
  const endAndEvaluateInterview = async () => {
    stopSpeaking();
    if (isListening && recognition) {
      recognition.stop();
      setIsListening(false);
    }

    setEvaluating(true);
    setStarted(false);
    setError(null);

    try {
      const history = messagesRef.current.map((m) => ({
        role: m.role === "ai" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      }));

      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate",
          company,
          role: "SDE",
          round,
          history,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to evaluate interview.");
      }

      setEvaluation(data.evaluation);

      // Save to Supabase DB
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const durationSeconds = 1800 - timeLeft;
          await supabase.from("mock_interviews").insert({
            user_id: user.id,
            company,
            role: "SDE",
            round,
            difficulty,
            score: data.evaluation.overallScore,
            feedback: data.evaluation,
            messages: messagesRef.current,
            duration_seconds: durationSeconds,
          });
          loadPastInterviews();
        }
      } catch (dbErr) {
        console.error("Error saving mock interview to DB:", dbErr);
      }
    } catch (err: any) {
      setError(err.message || "Failed to score interview. Please try again.");
    } finally {
      setEvaluating(false);
    }
  };

  // ─── Code Scratchpad helpers ───
  const changeCodeLang = (lang: string) => {
    setCodeLang(lang);
    setCode(codeTemplates[lang] || "");
  };

  const copyCodeToChat = () => {
    const formattedCode = `\n\`\`\`${codeLang}\n${code}\n\`\`\`\n`;
    setInput((prev) => prev + formattedCode);
  };

  const isCodingRound = round === "DSA" || round === "System Design";

  if (evaluating) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-400">
          <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
            <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Evaluating Performance...</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Gemini is grading your responses against our RAG model answers database.
        </p>
      </div>
    );
  }

  if (evaluation) {
    const overall = evaluation.overallScore || 0;
    const strokeDashoffset = Math.max(0, 352 - (352 * overall) / 100);

    return (
      <div className="space-y-8 animate-fade-in max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Interview Feedback</h1>
            <p className="text-sm text-gray-500 mt-1">{company} • {round} Round • SDE Role</p>
          </div>
          <button
            onClick={() => {
              setEvaluation(null);
              setMessages([]);
            }}
            className="btn-primary text-sm px-4 py-2"
          >
            Start Another
          </button>
        </div>

        {/* Overview Row */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Circular overall score */}
          <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <div className="relative w-32 h-32 mb-4">
              <svg className="-rotate-90" width="128" height="128" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="url(#intGrad)"
                  strokeWidth="12"
                  strokeDasharray="352"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="intGrad" x1="0%" y1="0%" x2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-white">{overall}</span>
                <span className="text-xs text-gray-500">/100</span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-white">Overall Score</h3>
            <p className="text-xs text-gray-400 mt-2 max-w-[200px] leading-relaxed">
              {evaluation.summary || "Your placement mock interview performance breakdown."}
            </p>
          </div>

          {/* Breakdown parameters */}
          <div className="md:col-span-2 glass-card rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">Competency Breakdown</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.entries(evaluation.scores || {}).map(([key, val]: any) => {
                const labelMap: Record<string, string> = {
                  technicalAccuracy: "Technical Accuracy",
                  communication: "Communication",
                  problemSolving: "Problem Solving",
                  confidence: "Confidence",
                };

                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">{labelMap[key] || key}</span>
                      <span className="text-white font-semibold">{val.score}/100</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full gradient-bg rounded-full"
                        style={{ width: `${val.score}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 leading-normal line-clamp-2">{val.feedback}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="glass-card rounded-xl p-5 border border-success-500/10 bg-success-500/[0.01]">
            <h3 className="text-sm font-bold text-success-400 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Key Strengths
            </h3>
            <ul className="space-y-2">
              {evaluation.strengths?.map((item: string, idx: number) => (
                <li key={idx} className="text-xs text-gray-300 leading-relaxed">• {item}</li>
              ))}
            </ul>
          </div>

          <div className="glass-card rounded-xl p-5 border border-warning-500/10 bg-warning-500/[0.01]">
            <h3 className="text-sm font-bold text-warning-400 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Areas to Improve
            </h3>
            <ul className="space-y-2">
              {evaluation.improvements?.map((item: string, idx: number) => (
                <li key={idx} className="text-xs text-gray-300 leading-relaxed">• {item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Question-by-Question Breakdown */}
        {evaluation.questionBreakdown && evaluation.questionBreakdown.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">Detailed Question Breakdown</h3>
            <div className="space-y-2">
              {evaluation.questionBreakdown.map((qb: any, idx: number) => {
                const isOpen = expandedQuestion === idx;
                return (
                  <div key={idx} className="glass-card rounded-xl overflow-hidden border border-white/5">
                    <button
                      onClick={() => setExpandedQuestion(isOpen ? null : idx)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex-1 pr-4">
                        <p className="text-xs text-primary-400 font-bold uppercase">Question {idx + 1}</p>
                        <p className="text-sm font-semibold text-white mt-0.5 line-clamp-1">{qb.question}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className={`text-sm font-bold ${qb.score >= 80 ? "text-success-400" : qb.score >= 60 ? "text-warning-400" : "text-error-400"}`}>
                          {qb.score}/100
                        </span>
                        <svg className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 pt-2 border-t border-white/5 space-y-4 animate-slide-down">
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-500 font-bold uppercase">Candidate Answer</p>
                          <p className="text-xs text-gray-300 bg-white/[0.01] p-3 rounded-lg border border-white/5 italic">
                            &ldquo;{qb.candidateAnswer}&rdquo;
                          </p>
                        </div>

                        {qb.modelAnswer && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-success-500 font-bold uppercase font-sans">Model Answer (RAG)</p>
                            <p className="text-xs text-gray-300 bg-success-500/[0.02] p-3 rounded-lg border border-success-500/5 whitespace-pre-wrap">
                              {qb.modelAnswer}
                            </p>
                          </div>
                        )}

                        <div className="space-y-1">
                          <p className="text-[10px] text-primary-500 font-bold uppercase">Feedback & Assessment</p>
                          <p className="text-xs text-gray-400">{qb.feedback}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (started) {
    const isTimerUrgent = timeLeft <= 120;
    const isTimerWarning = timeLeft <= 300 && timeLeft > 120;

    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
        {/* Interview Header */}
        <div className="glass-card rounded-xl p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{company} — {round} Round</p>
              <p className="text-xs text-gray-500">Difficulty: {difficulty} • RAG-powered questions</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Live Ticking Countdown Timer */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 ${
              isTimerUrgent 
                ? "bg-error-500/10 border-error-500/30 text-error-400 glow-red" 
                : isTimerWarning 
                  ? "bg-warning-500/10 border-warning-500/30 text-warning-400 glow-orange animate-pulse"
                  : "bg-white/5 border-white/10 text-gray-300"
            }`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-mono font-bold tracking-wider">{formatTime(timeLeft)}</span>
            </div>

            {/* TTS Voice toggler */}
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2 rounded-lg border transition-colors ${
                voiceEnabled
                  ? "bg-primary-500/20 border-primary-500/30 text-primary-400"
                  : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
              }`}
              title={voiceEnabled ? "Mute AI voice" : "Enable AI voice readout"}
            >
              {voiceEnabled ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L11.72 3.53a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={endAndEvaluateInterview}
                className="btn-primary text-xs px-3 py-1.5 shadow-lg shadow-primary-500/20"
              >
                Finish & Evaluate
              </button>
              <button
                onClick={() => {
                  stopSpeaking();
                  setStarted(false);
                }}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Quit
              </button>
            </div>
          </div>
        </div>

        {/* Master Flex grid for side-by-side IDE display */}
        <div className={`flex-1 min-h-0 grid gap-6 ${isCodingRound ? "lg:grid-cols-5" : "max-w-3xl w-full mx-auto"}`}>
          
          {/* Chat Stream View */}
          <div className={`${isCodingRound ? "lg:col-span-3" : ""} flex flex-col h-full min-h-0 bg-surface-900 border border-white/5 rounded-xl p-4 overflow-hidden`}>
            
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
              {messages.map((msg, i) => (
                <ChatMessage key={i} message={msg} />
              ))}
              
              {thinking && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-white shrink-0">
                    AI
                  </div>
                  <div className="glass-card rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Bottom Bar: Visual Waveform & Input Field */}
            <div className="space-y-3">
              {/* Voice Wave visualizer if active */}
              {isListening && (
                <div className="flex items-center gap-1 px-3 py-1.5 bg-primary-500/10 rounded-lg border border-primary-500/20 max-w-max animate-fade-in">
                  <div className="wave-bar wave-bar-1" />
                  <div className="wave-bar wave-bar-2" />
                  <div className="wave-bar wave-bar-3" />
                  <div className="wave-bar wave-bar-4" />
                  <div className="wave-bar wave-bar-5" />
                  <div className="wave-bar wave-bar-6" />
                  <div className="wave-bar wave-bar-7" />
                  <span className="text-[10px] font-bold uppercase text-primary-400 ml-2 tracking-wider animate-pulse-slow">
                    Listening...
                  </span>
                </div>
              )}

              {/* Chat Text Box and action items */}
              <div className="glass-card rounded-xl p-3 flex gap-3 items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={isListening ? "Listening to your voice..." : "Type your answer here..."}
                  className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
                  autoFocus
                />
                
                {/* Voice Input Mic Toggle button */}
                <button
                  onClick={toggleListening}
                  className={`p-2 rounded-lg transition-all ${
                    isListening
                      ? "bg-error-500/20 text-error-400 border border-error-500/30 scale-105"
                      : "bg-white/5 text-gray-400 hover:text-gray-200"
                  }`}
                  title={isListening ? "Stop listening" : "Talk via microphone"}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </button>

                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || thinking}
                  className={`p-2 rounded-lg transition-all ${
                    input.trim() && !thinking
                      ? "gradient-bg text-white shadow-lg"
                      : "bg-white/5 text-gray-600 cursor-not-allowed"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible IDE Coding Pad */}
          {isCodingRound && (
            <div className="lg:col-span-2 flex flex-col h-full min-h-0 bg-surface-900 border border-white/5 rounded-xl p-4 overflow-hidden">
              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-error-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-warning-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-success-500" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">IDE Scratchpad</span>
                </div>

                {/* Font Size controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setFontSize(Math.max(10, fontSize - 1))}
                    className="w-6 h-6 rounded bg-white/5 text-gray-400 flex items-center justify-center text-xs hover:bg-white/10"
                    title="Decrease font size"
                  >
                    -
                  </button>
                  <span className="text-[10px] text-gray-500 font-mono w-6 text-center">{fontSize}px</span>
                  <button
                    onClick={() => setFontSize(Math.min(22, fontSize + 1))}
                    className="w-6 h-6 rounded bg-white/5 text-gray-400 flex items-center justify-center text-xs hover:bg-white/10"
                    title="Increase font size"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Language selection tabs */}
              <div className="flex gap-1.5 mb-3">
                {["javascript", "python", "cpp", "java"].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => changeCodeLang(lang)}
                    className={`px-2.5 py-1 text-[11px] font-mono rounded uppercase font-bold transition-all ${
                      codeLang === lang
                        ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                        : "bg-white/5 text-gray-500 border border-transparent hover:bg-white/10"
                    }`}
                  >
                    {lang === "cpp" ? "C++" : lang}
                  </button>
                ))}
              </div>

              {/* Monospace scroll-synced Custom Editor Area */}
              <div className="flex-1 min-h-0 border border-white/10 rounded-lg overflow-hidden flex font-mono bg-surface-950 text-sm">
                {/* Numbers Line Gutter */}
                <div
                  className="bg-white/5 text-gray-600 select-none py-3 px-2 border-r border-white/5 text-right w-10 flex flex-col overflow-hidden"
                  style={{ fontSize: `${fontSize}px`, lineHeight: "24px" }}
                >
                  {Array.from({ length: Math.max(code.split("\n").length, 12) }, (_, i) => i + 1).map((n) => (
                    <span key={n} className="block">{n}</span>
                  ))}
                </div>

                {/* Main input scratchpad */}
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 code-textarea p-3 outline-none resize-none overflow-y-auto leading-[24px]"
                  style={{ fontSize: `${fontSize}px` }}
                  placeholder="// Paste or write your code block here..."
                />
              </div>

              {/* Code pad Actions */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                <button
                  onClick={copyCodeToChat}
                  className="flex-1 btn-primary py-2 text-xs flex items-center justify-center gap-1.5"
                  title="Copy this code formatted into the chat entry box"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Insert Code to Chat
                </button>
                <button
                  onClick={() => setCode("")}
                  className="btn-secondary py-2 text-xs hover:text-red-400 hover:border-red-500/20"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Mock Interview</h1>
        <p className="text-gray-400 mt-1">
          Practice with real company-specific questions from our RAG knowledge base.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-error-500/10 border border-error-500/20 text-error-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Configuration */}
      <div className="glass-card rounded-xl p-6 space-y-6">
        <h2 className="text-lg font-semibold text-white">Configure Your Interview</h2>

        <ConfigCard label="Company" options={companyOptions} selected={company} onSelect={setCompany} />
        <ConfigCard label="Round" options={roundOptions} selected={round} onSelect={setRound} />
        <ConfigCard label="Difficulty" options={difficultyOptions} selected={difficulty} onSelect={setDifficulty} />

        <button onClick={startInterview} className="w-full btn-primary py-4">
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
            Start Mock Interview
          </span>
        </button>
      </div>

      {/* Past Interviews */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Past Interviews</h2>
        {loadingHistory ? (
          <div className="text-sm text-gray-500 py-4 text-center">Loading past interviews...</div>
        ) : pastInterviews.length > 0 ? (
          <div className="space-y-3">
            {pastInterviews.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setEvaluation(item.feedback);
                  setMessages(item.messages || []);
                  setCompany(item.company);
                  setRound(item.round);
                  setDifficulty(item.difficulty || "Medium");
                }}
                className="glass-card rounded-xl p-4 flex items-center justify-between group cursor-pointer hover:border-primary-500/20 hover:bg-white/[0.01] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs text-white ${
                    item.score >= 80 ? "bg-success-500/20 text-success-400" : item.score >= 60 ? "bg-warning-500/20 text-warning-400" : "bg-error-500/20 text-error-400"
                  }`}>
                    {item.score}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-primary-400 transition-colors">
                      {item.company} — {item.round}
                    </p>
                    <p className="text-xs text-gray-500">{timeAgo(item.created_at)}</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 py-6 border border-dashed border-white/10 rounded-xl text-center">
            No past interviews yet. Configure and start an interview to practice!
          </div>
        )}
      </div>
    </div>
  );
}
