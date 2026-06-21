"use client";

import { useState, useEffect, useRef } from "react";

/* ───────── Animated Counter Hook ───────── */
function useCountUp(end: number, duration = 2000, start = 0) {
  const [count, setCount] = useState(start);
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(start + (end - start) * eased));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, start]);

  return { count, ref };
}

/* ───────── Intersection Observer for Animations ───────── */
function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isInView };
}

/* ───────── Icon Components ───────── */
function ResumeIcon() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function RoadmapIcon() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m0 0l3-3m-3 3l-3-3m12-1.5V15m0 0l3-3m-3 3l-3-3M5.25 4.5h13.5c.966 0 1.75.784 1.75 1.75v11.5a1.75 1.75 0 01-1.75 1.75H5.25A1.75 1.75 0 013.5 17.75V6.25c0-.966.784-1.75 1.75-1.75z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-success-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 14.5M14.25 3.104c.251.023.501.05.75.082M19.8 14.5a2.25 2.25 0 010 3l-3.3 3.3a2.25 2.25 0 01-3 0L12 19.3l-1.5 1.5a2.25 2.25 0 01-3 0l-3.3-3.3a2.25 2.25 0 010-3" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

/* ───────── Navbar ───────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const links = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass shadow-lg shadow-black/20 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:shadow-primary-500/50 transition-shadow">
            <BrainIcon />
          </div>
          <span className="text-xl font-bold">
            Placement<span className="gradient-text">Plot</span>
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-gray-400 hover:text-white transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 hover:after:w-full after:h-0.5 after:bg-primary-500 after:transition-all"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a href="#pricing" className="btn-secondary text-sm px-4 py-2">
            Log In
          </a>
          <a href="#pricing" className="btn-primary text-sm px-5 py-2.5 flex items-center">
            <span>Get Started Free</span>
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-gray-400 hover:text-white"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass mt-2 mx-4 rounded-xl p-4 animate-slide-down">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 text-gray-400 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
            <a href="#pricing" className="btn-secondary text-sm text-center py-2.5">Log In</a>
            <a href="#pricing" className="btn-primary text-sm text-center py-2.5"><span>Get Started Free</span></a>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ───────── Hero Section ───────── */
function Hero() {
  const words = ["Placement-Ready", "Interview-Ready", "Resume-Perfect", "Career-Ready"];
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];
    const timeout = setTimeout(
      () => {
        if (!deleting) {
          setDisplayed(currentWord.substring(0, displayed.length + 1));
          if (displayed.length + 1 === currentWord.length) {
            setTimeout(() => setDeleting(true), 1500);
          }
        } else {
          setDisplayed(currentWord.substring(0, displayed.length - 1));
          if (displayed.length === 0) {
            setDeleting(false);
            setWordIndex((prev) => (prev + 1) % words.length);
          }
        }
      },
      deleting ? 50 : 100
    );
    return () => clearTimeout(timeout);
  }, [displayed, deleting, wordIndex, words]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary-500/10 rounded-full blur-[128px] animate-pulse-slow" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent-500/10 rounded-full blur-[128px] animate-pulse-slow" style={{ animationDelay: "1.5s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/5 rounded-full blur-[200px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8 animate-slide-down">
          <span className="w-2 h-2 rounded-full bg-success-400 animate-pulse" />
          <span className="text-sm text-gray-300">
            Powered by RAG + AI — Not Just Another ChatGPT Wrapper
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 animate-slide-up">
          <span className="text-white">Become</span>{" "}
          <span className="gradient-text glow-text min-w-[300px] inline-block text-left">
            {displayed}
            <span className="animate-pulse">|</span>
          </span>
          <br />
          <span className="text-white">With AI That Knows</span>{" "}
          <span className="gradient-text">Real Placements</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-10 animate-slide-up stagger-2" style={{ animationFillMode: "backwards" }}>
          ATS resume scoring, mock interviews with real company questions, and personalized roadmaps
          — all grounded in actual placement data from 30+ companies using RAG technology.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up stagger-3" style={{ animationFillMode: "backwards" }}>
          <a href="#pricing" className="btn-primary text-lg px-8 py-4 group flex items-center">
            <span className="flex items-center">
              Start Free — No Credit Card
              <ArrowRightIcon />
            </span>
          </a>
          <a href="#features" className="btn-secondary text-lg px-8 py-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
            </svg>
            See How It Works
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto animate-slide-up stagger-4" style={{ animationFillMode: "backwards" }}>
          <StatCard label="Interview Questions" end={5000} suffix="+" />
          <StatCard label="Companies Covered" end={30} suffix="+" />
          <StatCard label="Resume Examples" end={10000} suffix="+" />
          <StatCard label="Avg Score Increase" end={47} suffix="%" />
        </div>

        {/* Hero visual mockup */}
        <div className="mt-16 relative mx-auto max-w-5xl animate-slide-up stagger-5" style={{ animationFillMode: "backwards" }}>
          <div className="glass-card rounded-2xl p-1 glow-blue">
            <div className="bg-surface-900 rounded-xl overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-error-400/80" />
                  <div className="w-3 h-3 rounded-full bg-warning-400/80" />
                  <div className="w-3 h-3 rounded-full bg-success-400/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="glass-light rounded-md px-4 py-1 text-xs text-gray-500 flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    app.placementplot.ai/dashboard
                  </div>
                </div>
              </div>
              {/* Dashboard preview */}
              <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* ATS Score Card */}
                <div className="glass-card rounded-xl p-5 flex flex-col items-center">
                  <div className="relative w-24 h-24 mb-3">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke="url(#scoreGrad)" strokeWidth="8" strokeDasharray="264" strokeDashoffset="53" strokeLinecap="round" />
                      <defs>
                        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">87</span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-white">ATS Score</p>
                  <p className="text-xs text-gray-500">Your resume</p>
                </div>

                {/* Interview Progress */}
                <div className="glass-card rounded-xl p-5">
                  <p className="text-sm font-semibold text-white mb-3">Mock Interviews</p>
                  <div className="space-y-2.5">
                    {[
                      { company: "TCS", score: 82, color: "bg-primary-500" },
                      { company: "Google", score: 68, color: "bg-accent-500" },
                      { company: "Infosys", score: 91, color: "bg-success-500" },
                    ].map((item) => (
                      <div key={item.company}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">{item.company}</span>
                          <span className="text-white font-medium">{item.score}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Roadmap Preview */}
                <div className="glass-card rounded-xl p-5">
                  <p className="text-sm font-semibold text-white mb-3">Your Roadmap</p>
                  <div className="space-y-2">
                    {[
                      { week: "Week 1", task: "DSA Basics", done: true },
                      { week: "Week 2", task: "Arrays & Strings", done: true },
                      { week: "Week 3", task: "Trees & Graphs", done: false },
                      { week: "Week 4", task: "System Design", done: false },
                    ].map((item) => (
                      <div key={item.week} className="flex items-center gap-2 text-xs">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${item.done ? "border-success-400 bg-success-400/20" : "border-gray-600"}`}>
                          {item.done && (
                            <svg className="w-2.5 h-2.5 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                        <span className="text-gray-500">{item.week}</span>
                        <span className={item.done ? "text-gray-400 line-through" : "text-white"}>{item.task}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Bottom glow */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-primary-500/20 blur-[60px]" />
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, end, suffix }: { label: string; end: number; suffix: string }) {
  const { count, ref } = useCountUp(end, 2000);
  return (
    <div className="text-center">
      <p className="text-2xl sm:text-3xl font-bold text-white" ref={ref}>
        {count.toLocaleString()}{suffix}
      </p>
      <p className="text-xs sm:text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

/* ───────── Features Section ───────── */
const features = [
  {
    icon: <ResumeIcon />,
    title: "ATS Resume Score",
    description: "Upload your resume and get an instant ATS compatibility score. Our RAG system checks against real ATS rules and industry standards — not generic advice.",
    color: "from-blue-500 to-cyan-500",
    tag: "Most Popular",
  },
  {
    icon: <SparklesIcon />,
    title: "Resume Bullet Enhancer",
    description: "Paste weak bullet points and get STAR/XYZ-enhanced rewrites inspired by 10,000+ high-scoring resume examples from real placements.",
    color: "from-violet-500 to-purple-500",
    tag: "AI-Powered",
  },
  {
    icon: <ChatIcon />,
    title: "AI Mock Interviews",
    description: "Practice with an AI interviewer that asks real company-specific questions. Get scored on Technical Accuracy, Communication, and Problem Solving.",
    color: "from-emerald-500 to-teal-500",
    tag: "Interactive",
  },
  {
    icon: <BuildingIcon />,
    title: "Company-wise Questions",
    description: "Browse 5,000+ real interview questions from TCS, Infosys, Google, Amazon, and 26 more companies. Semantic search finds exactly what you need.",
    color: "from-amber-500 to-orange-500",
    tag: "30+ Companies",
  },
  {
    icon: <RoadmapIcon />,
    title: "Placement Roadmap",
    description: "Get a personalized week-by-week study plan based on your target companies, skill level, and available time. Every resource is hand-picked by our RAG system.",
    color: "from-pink-500 to-rose-500",
    tag: "Personalized",
  },
  {
    icon: <BrainIcon />,
    title: "RAG-Powered Precision",
    description: "Unlike generic AI tools, every response is grounded in real placement data — actual questions, real resumes, actual hiring patterns. Data ChatGPT doesn't have.",
    color: "from-primary-500 to-accent-500",
    tag: "Our Moat",
  },
];

function Features() {
  const { ref, isInView } = useInView();

  return (
    <section id="features" className="py-24 sm:py-32 relative" ref={ref}>
      <div className="absolute inset-0 grid-pattern opacity-50" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-primary-400 bg-primary-500/10 px-3 py-1 rounded-full mb-4">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Everything You Need to{" "}
            <span className="gradient-text">Get Placed</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Five AI-powered tools, all backed by a knowledge base of real placement data.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`glass-card rounded-2xl p-6 group relative overflow-hidden transition-all duration-500 ${
                isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {/* Gradient glow on hover */}
              <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${feature.color} rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                {/* Tag */}
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-white/5 px-2 py-0.5 rounded mb-4">
                  {feature.tag}
                </span>

                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── How It Works Section ───────── */
const steps = [
  {
    step: "01",
    title: "Upload & Analyze",
    description: "Upload your resume or paste bullet points. Our system extracts text and analyzes it against ATS best practices from our knowledge base.",
  },
  {
    step: "02",
    title: "RAG Retrieves Context",
    description: "Our AI searches through 5 specialized knowledge bases to find the most relevant ATS rules, resume examples, and company patterns for YOUR specific case.",
  },
  {
    step: "03",
    title: "AI Generates Precise Feedback",
    description: "Gemini AI produces feedback grounded in real data — not hallucinations. Every suggestion references actual placement patterns and examples.",
  },
  {
    step: "04",
    title: "Improve & Get Placed",
    description: "Follow your personalized roadmap, practice with mock interviews, and watch your ATS score climb. Students see 47% average improvement.",
  },
];

function HowItWorks() {
  const { ref, isInView } = useInView();

  return (
    <section id="how-it-works" className="py-24 sm:py-32 relative" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-accent-400 bg-accent-500/10 px-3 py-1 rounded-full mb-4">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            From Upload to{" "}
            <span className="gradient-text">Placed</span>{" "}
            in 4 Steps
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div
              key={step.step}
              className={`relative transition-all duration-500 ${
                isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[60%] w-[calc(100%-20%)] h-[2px] bg-gradient-to-r from-primary-500/50 to-accent-500/50" />
              )}

              <div className="relative">
                <div className="text-6xl font-black gradient-text opacity-20 mb-2">
                  {step.step}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Pricing Section ───────── */
const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Try out the platform and see the quality difference.",
    features: [
      "2 Resume Analyses",
      "1 Mock Interview",
      "Browse 5 questions/company",
      "Basic ATS score",
      "Community support",
    ],
    cta: "Start Free",
    popular: false,
    gradient: "",
  },
  {
    name: "Premium",
    price: "₹149",
    period: "/month",
    description: "Unlimited access to all AI features. Best for serious prep.",
    features: [
      "Unlimited Resume Analyses",
      "Unlimited Mock Interviews",
      "Full Placement Roadmap",
      "All 30+ Company Questions",
      "Resume Bullet Enhancer",
      "RAG-powered precision",
      "Priority support",
    ],
    cta: "Get Premium",
    popular: true,
    gradient: "from-primary-500 to-accent-500",
  },
  {
    name: "Interview Pack",
    price: "₹99",
    period: "/company",
    description: "Deep-dive into a specific company's interview patterns.",
    features: [
      "50+ Company-specific Questions",
      "Model Answers with Explanations",
      "Hiring Process Breakdown",
      "Difficulty Analysis",
      "Custom Mock Interview",
    ],
    cta: "Buy Pack",
    popular: false,
    gradient: "",
  },
];

function Pricing() {
  const { ref, isInView } = useInView();

  return (
    <section id="pricing" className="py-24 sm:py-32 relative" ref={ref}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-500/5 rounded-full blur-[150px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-success-400 bg-success-500/10 px-3 py-1 rounded-full mb-4">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Start Free,{" "}
            <span className="gradient-text">Upgrade When Ready</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            No credit card required. Experience the power of RAG-based placement prep before you commit.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-[1px] transition-all duration-500 ${
                isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              } ${
                plan.popular
                  ? "bg-gradient-to-b from-primary-500 to-accent-500 scale-105"
                  : ""
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 gradient-bg text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg shadow-primary-500/30">
                  MOST POPULAR
                </div>
              )}

              <div className={`h-full rounded-2xl p-8 ${plan.popular ? "bg-surface-900" : "glass-card"}`}>
                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-400 mb-6">{plan.description}</p>

                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>

                <button
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.popular
                      ? "btn-primary"
                      : "btn-secondary"
                  }`}
                >
                  <span>{plan.cta}</span>
                </button>

                <div className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <CheckIcon />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── FAQ Section ───────── */
const faqs = [
  {
    q: "How is PlacementPlot AI different from ChatGPT?",
    a: "ChatGPT gives generic advice. PlacementPlot AI uses RAG (Retrieval Augmented Generation) to ground every response in real placement data — actual interview questions from TCS 2024, real resume bullets from Google placements, and actual hiring patterns of Indian companies. Our knowledge base has 5,000+ real questions and 10,000+ resume examples.",
  },
  {
    q: "What is RAG and why does it matter?",
    a: "RAG stands for Retrieval Augmented Generation. Instead of relying on an AI's training data (which can be outdated or generic), we maintain 5 specialized knowledge bases. When you ask a question, our system first retrieves the most relevant real-world data, then uses AI to generate a precise response grounded in that data. This means zero hallucinations and company-specific accuracy.",
  },
  {
    q: "Which companies are covered?",
    a: "We cover 30+ companies including service-based (TCS, Infosys, Wipro, Cognizant, Accenture, HCL, Tech Mahindra, Capgemini) and product-based (Google, Microsoft, Amazon, Meta, Adobe, Goldman Sachs, Flipkart, Paytm, Razorpay, Swiggy, Zomato, and more). New companies are added regularly.",
  },
  {
    q: "Can I use it for free?",
    a: "Yes! The free tier includes 2 resume analyses, 1 mock interview, and the ability to browse 5 questions per company. It's enough to experience the quality difference. Upgrade to Premium (₹149/month) for unlimited access.",
  },
  {
    q: "How accurate is the ATS resume score?",
    a: "Our ATS scoring is based on actual ATS parsing rules and industry standards stored in our knowledge base. We analyze formatting, keyword alignment, structure, impact quantification, and consistency. Students who followed our suggestions saw a 47% average improvement in their ATS pass rates.",
  },
  {
    q: "Is my resume data secure?",
    a: "Absolutely. Your resume data is encrypted at rest and in transit. We use Supabase's enterprise-grade security. We never share your data with third parties, and you can delete your data at any time from your dashboard.",
  },
];

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { ref, isInView } = useInView();

  return (
    <section id="faq" className="py-24 sm:py-32" ref={ref}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-warning-400 bg-warning-500/10 px-3 py-1 rounded-full mb-4">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Got Questions?
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`glass-card rounded-xl overflow-hidden transition-all duration-500 ${
                isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-semibold text-white pr-4">{faq.q}</span>
                <ChevronDownIcon
                  className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === i ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <p className="px-5 pb-5 text-sm text-gray-400 leading-relaxed">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── CTA Section ───────── */
function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 gradient-bg-animated opacity-10" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-[128px]" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
          Ready to Ace Your{" "}
          <span className="gradient-text">Placements</span>?
        </h2>
        <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
          Join thousands of engineering students who are preparing smarter with AI that understands real placements.
        </p>
        <a href="#pricing" className="btn-primary text-lg px-10 py-4 inline-flex items-center group">
          <span className="flex items-center">
            Start Free Today
            <ArrowRightIcon />
          </span>
        </a>
        <p className="text-sm text-gray-500 mt-4">No credit card required · 2 free resume analyses</p>
      </div>
    </section>
  );
}

/* ───────── Footer ───────── */
function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                <BrainIcon />
              </div>
              <span className="text-lg font-bold text-white">PlacementPlot</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              AI-powered placement preparation for Indian engineering students. Built with RAG technology for precise results.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2.5">
              {["ATS Resume Score", "Resume Enhancer", "Mock Interviews", "Company Questions", "Placement Roadmap"].map((item) => (
                <li key={item}>
                  <a href="#features" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2.5">
              {["About", "Blog", "Careers", "Contact", "Privacy Policy"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Connect</h4>
            <ul className="space-y-2.5">
              {["Twitter / X", "LinkedIn", "Instagram", "Discord", "YouTube"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} PlacementPlot AI. All rights reserved.
          </p>
          <p className="text-xs text-gray-600">
            Made with 🧠 for Indian engineering students
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ───────── Companies Marquee ───────── */
function CompanyMarquee() {
  const companies = [
    "TCS", "Infosys", "Wipro", "Google", "Microsoft", "Amazon",
    "Adobe", "Goldman Sachs", "Flipkart", "Razorpay", "Paytm",
    "Swiggy", "Cognizant", "Accenture", "Meta", "Zomato",
  ];

  return (
    <section className="py-16 border-t border-b border-white/5 overflow-hidden">
      <p className="text-center text-sm text-gray-500 mb-8 uppercase tracking-widest">
        Interview questions from 30+ companies
      </p>
      <div className="relative">
        <div className="flex gap-12 animate-[scroll_30s_linear_infinite]">
          {[...companies, ...companies].map((company, i) => (
            <span
              key={`${company}-${i}`}
              className="text-xl font-bold text-gray-700 whitespace-nowrap hover:text-gray-400 transition-colors"
            >
              {company}
            </span>
          ))}
        </div>
        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-surface-950 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-surface-950 to-transparent pointer-events-none" />
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}

/* ───────── Main Page ───────── */
export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <CompanyMarquee />
      <Features />
      <HowItWorks />
      <Pricing />
      <FAQ />
      <CTASection />
      <Footer />
    </main>
  );
}
