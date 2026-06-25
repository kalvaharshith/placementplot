"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";

/* ───────── Animated Score Ring ───────── */
function ScoreRing({ score, size = 120, label }: { score: number; size?: number; label: string }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 300);
    return () => clearTimeout(timer);
  }, [score]);

  const getColor = (s: number) => {
    if (s >= 80) return "#22c55e";
    if (s >= 60) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="10"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getColor(animatedScore)}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{animatedScore}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">/ 100</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-gray-400">{label}</p>
    </div>
  );
}

/* ───────── Quick Action Card ───────── */
function ActionCard({
  title,
  description,
  icon,
  href,
  gradient,
  tag,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  gradient: string;
  tag?: string;
}) {
  return (
    <Link
      href={href}
      className="glass-card rounded-xl p-5 group relative overflow-hidden"
    >
      <div className={`absolute -top-16 -right-16 w-32 h-32 bg-gradient-to-br ${gradient} rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
            {icon}
          </div>
          {tag && (
            <span className="text-[10px] font-bold uppercase bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded">
              {tag}
            </span>
          )}
        </div>
        <h3 className="text-base font-semibold text-white mb-1 group-hover:text-primary-400 transition-colors">
          {title}
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      </div>
    </Link>
  );
}

/* ───────── Activity Item ───────── */
function ActivityItem({
  action,
  detail,
  time,
  icon,
}: {
  action: string;
  detail: string;
  time: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">{action}</p>
        <p className="text-xs text-gray-500 truncate">{detail}</p>
      </div>
      <span className="text-[10px] text-gray-600 whitespace-nowrap">{time}</span>
    </div>
  );
}

/* ───────── Dashboard Page ───────── */
export default function DashboardPage() {
  const [stats, setStats] = useState({
    atsScore: 0,
    interviewsDone: 0,
    resumesAnalyzed: 0,
    roadmapProgress: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch latest ATS score & count of resumes
        const { data: resumes } = await supabase
          .from("resumes")
          .select("ats_score, file_name, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        const latestAtsScore = resumes?.[0]?.ats_score || 0;
        const resumesAnalyzed = resumes?.length || 0;

        // Fetch interview count & latest score
        const { data: interviews } = await supabase
          .from("mock_interviews")
          .select("score, company, round, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        const interviewsDone = interviews?.length || 0;

        // Fetch roadmap progress
        const { data: roadmapData } = await supabase
          .from("roadmap_plans")
          .select("progress, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1);

        const roadmapProgress = roadmapData?.[0]?.progress || 0;

        setStats({
          atsScore: latestAtsScore,
          interviewsDone,
          resumesAnalyzed,
          roadmapProgress,
        });

        // Build recent activity from real data
        const activities: any[] = [];

        if (resumes && resumes.length > 0) {
          const latest = resumes[0];
          activities.push({
            action: "Resume analyzed",
            detail: `ATS Score: ${latest.ats_score}/100 — ${latest.file_name}`,
            time: latest.created_at,
            type: "resume",
          });
        }

        if (interviews && interviews.length > 0) {
          const latest = interviews[0];
          activities.push({
            action: `Mock Interview — ${latest.company}`,
            detail: `${latest.round} Round — Score: ${latest.score}/100`,
            time: latest.created_at,
            type: "interview",
          });
        }

        if (roadmapData && roadmapData.length > 0) {
          activities.push({
            action: "Roadmap updated",
            detail: `Progress: ${roadmapProgress}% complete`,
            time: roadmapData[0].updated_at,
            type: "roadmap",
          });
        }

        // Sort by time descending
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setRecentActivity(activities);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);



  const activityIcons: Record<string, React.ReactNode> = {
    resume: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    interview: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    roadmap: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    ),
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          Welcome back! 👋
        </h1>
        <p className="text-gray-400 mt-1">
          Here&apos;s your placement readiness overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "ATS Score",
            value: loading ? "..." : stats.atsScore > 0 ? String(stats.atsScore) : "—",
            change: stats.atsScore >= 80 ? "Excellent" : stats.atsScore >= 60 ? "Good" : stats.atsScore > 0 ? "Needs work" : "Not scored yet",
            color: stats.atsScore >= 80 ? "text-success-400" : stats.atsScore >= 60 ? "text-warning-400" : "text-gray-500",
          },
          {
            label: "Interviews Done",
            value: loading ? "..." : String(stats.interviewsDone),
            change: stats.interviewsDone > 0 ? `${stats.interviewsDone} session${stats.interviewsDone > 1 ? "s" : ""}` : "Start one!",
            color: "text-primary-400",
          },
          {
            label: "Resumes Analyzed",
            value: loading ? "..." : String(stats.resumesAnalyzed),
            change: stats.resumesAnalyzed > 0 ? `${stats.resumesAnalyzed} upload${stats.resumesAnalyzed > 1 ? "s" : ""}` : "Upload first",
            color: "text-accent-400",
          },
          {
            label: "Roadmap Progress",
            value: loading ? "..." : `${stats.roadmapProgress}%`,
            change: stats.roadmapProgress >= 80 ? "Almost done!" : stats.roadmapProgress > 0 ? "On track" : "Get started",
            color: "text-warning-400",
          },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
            <p className={`text-xs mt-1 ${stat.color}`}>{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column: Score + Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Placement Readiness */}
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Placement Readiness</h2>
            <div className="grid grid-cols-3 gap-4">
              <ScoreRing score={loading ? 0 : stats.atsScore} label="ATS Score" />
              <ScoreRing score={loading ? 0 : Math.min(100, stats.interviewsDone * 20)} label="Interview" />
              <ScoreRing score={loading ? 0 : stats.roadmapProgress} label="Roadmap" />
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <ActionCard
                title="Analyze Resume"
                description="Upload your resume and get an instant ATS score with actionable feedback."
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                }
                href="/dashboard/resume"
                gradient="from-blue-500 to-cyan-500"
                tag={stats.resumesAnalyzed > 0 ? `${stats.resumesAnalyzed} done` : "Start"}
              />
              <ActionCard
                title="Start Mock Interview"
                description="Practice with AI that asks real company-specific questions."
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                }
                href="/dashboard/interview"
                gradient="from-emerald-500 to-teal-500"
              />
              <ActionCard
                title="Browse Companies"
                description="Explore 5,000+ real interview questions from 30+ companies."
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                }
                href="/dashboard/companies"
                gradient="from-amber-500 to-orange-500"
                tag="30+"
              />
              <ActionCard
                title="View Roadmap"
                description="Your personalized week-by-week study plan for target companies."
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m0 0l3-3m-3 3l-3-3m12-1.5V15m0 0l3-3m-3 3l-3-3" />
                  </svg>
                }
                href="/dashboard/roadmap"
                gradient="from-pink-500 to-rose-500"
                tag={stats.roadmapProgress > 0 ? `${stats.roadmapProgress}%` : undefined}
              />
            </div>
          </div>
        </div>

        {/* Right column: Activity Feed */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
            <div className="divide-y divide-white/5">
              {loading ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-gray-500">Loading activity...</p>
                </div>
              ) : recentActivity.length > 0 ? (
                recentActivity.map((item, i) => (
                  <ActivityItem
                    key={i}
                    action={item.action}
                    detail={item.detail}
                    time={timeAgo(item.time)}
                    icon={activityIcons[item.type] || activityIcons.resume}
                  />
                ))
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-gray-500">No activity yet — start by analyzing a resume!</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming targets */}
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-4">Getting Started</h2>
            <div className="space-y-3">
              {[
                { task: "Upload and analyze your resume", done: stats.resumesAnalyzed > 0 },
                { task: "Complete a mock interview", done: stats.interviewsDone > 0 },
                { task: "Browse company questions", done: false },
                { task: "Generate your placement roadmap", done: stats.roadmapProgress > 0 },
              ].map((item, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    item.done
                      ? "bg-success-500/20 border-success-400"
                      : "border-gray-600 group-hover:border-gray-400"
                  }`}>
                    {item.done && (
                      <svg className="w-3 h-3 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm ${item.done ? "text-gray-500 line-through" : "text-gray-300"}`}>
                    {item.task}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
