"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/* ───────── Roadmap Data ───────── */
const roadmapWeeks = [
  {
    week: 1,
    title: "Foundations",
    focus: "Programming Basics & Aptitude",
    tasks: [
      { task: "Complete arrays & strings fundamentals", type: "DSA", done: false, resource: "GeeksforGeeks" },
      { task: "Solve 20 aptitude problems (Quantitative)", type: "Aptitude", done: false, resource: "IndiaBIX" },
      { task: "Revise Time & Space complexity", type: "Theory", done: false, resource: "YouTube - Abdul Bari" },
      { task: "Practice 5 TCS NQT-style problems", type: "Practice", done: false, resource: "PrepInsta" },
    ],
    progress: 0,
  },
  {
    week: 2,
    title: "Data Structures",
    focus: "Linked Lists, Stacks, Queues",
    tasks: [
      { task: "Master linked list operations", type: "DSA", done: false, resource: "LeetCode" },
      { task: "Implement stack & queue from scratch", type: "DSA", done: false, resource: "GeeksforGeeks" },
      { task: "Solve 15 medium-level problems", type: "Practice", done: false, resource: "LeetCode" },
      { task: "Mock interview — Infosys pattern", type: "Interview", done: false, resource: "PlacementPlot AI" },
    ],
    progress: 0,
  },
  {
    week: 3,
    title: "Trees & Graphs",
    focus: "Binary Trees, BST, Graph Traversals",
    tasks: [
      { task: "Learn BFS and DFS traversals", type: "DSA", done: false, resource: "YouTube - Striver" },
      { task: "Practice tree problems (15 questions)", type: "Practice", done: false, resource: "LeetCode" },
      { task: "Graph representation & algorithms", type: "DSA", done: false, resource: "GeeksforGeeks" },
      { task: "Mock interview — TCS Technical", type: "Interview", done: false, resource: "PlacementPlot AI" },
    ],
    progress: 0,
  },
  {
    week: 4,
    title: "Advanced Topics",
    focus: "Dynamic Programming & System Design",
    tasks: [
      { task: "DP fundamentals — Fibonacci, Knapsack", type: "DSA", done: false, resource: "YouTube - Striver" },
      { task: "Solve 10 DP problems", type: "Practice", done: false, resource: "LeetCode" },
      { task: "Basic System Design concepts", type: "Theory", done: false, resource: "YouTube - Gaurav Sen" },
      { task: "Full mock interview — Google SDE", type: "Interview", done: false, resource: "PlacementPlot AI" },
    ],
    progress: 0,
  },
];

const typeColors: Record<string, string> = {
  DSA: "bg-primary-500/20 text-primary-400",
  Aptitude: "bg-accent-500/20 text-accent-400",
  Theory: "bg-warning-500/20 text-warning-400",
  Practice: "bg-success-500/20 text-success-400",
  Interview: "bg-pink-500/20 text-pink-400",
};

export default function RoadmapPage() {
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roadmapId, setRoadmapId] = useState<string | null>(null);
  
  // ─── API Setup Form States ───
  const [targetCompanies, setTargetCompanies] = useState<string[]>(["TCS", "Infosys"]);
  const [skillLevel, setSkillLevel] = useState("Intermediate");
  const [availableHours, setAvailableHours] = useState(15);
  const [timelineMonths, setTimelineMonths] = useState(3);

  // ─── Response States ───
  const [roadmapData, setRoadmapData] = useState<any | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Interactive Checklist State ───
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  const toggleCompany = (c: string) => {
    setTargetCompanies((prev) =>
      prev.includes(c) ? prev.filter((item) => item !== c) : [...prev, c]
    );
  };

  const loadRoadmap = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("roadmap_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const plan = data[0];
        setRoadmapId(plan.id);
        setRoadmapData({
          title: plan.target_companies && plan.target_companies.length > 0
            ? `${plan.target_companies.join(" & ")} Prep Plan`
            : "Your Placement Roadmap",
          weeks: plan.weeks,
        });
        setTargetCompanies(plan.target_companies || ["TCS", "Infosys"]);
        setSkillLevel(plan.skill_level || "Intermediate");
        setAvailableHours(plan.available_hours || 15);
        setTimelineMonths(plan.timeline_months || 3);

        // Populate completed tasks from the loaded plan
        const initial: Record<string, boolean> = {};
        plan.weeks.forEach((week: any, wIdx: number) => {
          week.tasks?.forEach((task: any, tIdx: number) => {
            if (task.done) {
              initial[`${wIdx}-${tIdx}`] = true;
            }
          });
        });
        setCompletedTasks(initial);
      } else {
        // No roadmap exists in DB yet. Initialize it with the default template,
        // but set all default tasks' done status to false so they start fresh!
        const defaultWeeks = roadmapWeeks.map((week) => ({
          ...week,
          tasks: (week.tasks || []).map((task) => ({ ...task, done: false })),
          progress: 0,
        }));

        const { data: inserted, error: insertErr } = await supabase
          .from("roadmap_plans")
          .insert({
            user_id: user.id,
            target_companies: ["TCS", "Infosys"],
            skill_level: "Intermediate",
            available_hours: 15,
            timeline_months: 3,
            weeks: defaultWeeks,
            progress: 0,
          })
          .select();

        if (insertErr) throw insertErr;

        if (inserted && inserted.length > 0) {
          const plan = inserted[0];
          setRoadmapId(plan.id);
          setRoadmapData({
            title: "TCS & Infosys Prep Plan",
            weeks: plan.weeks,
          });
          setCompletedTasks({});
        }
      }
    } catch (err) {
      console.error("Error loading roadmap:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoadmap();
  }, []);

  const saveRoadmapState = async (updatedWeeks: any[], newProgress: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (roadmapId) {
        const { error } = await supabase
          .from("roadmap_plans")
          .update({
            weeks: updatedWeeks,
            progress: newProgress,
            updated_at: new Date().toISOString(),
          })
          .eq("id", roadmapId);
        
        if (error) throw error;
      }
    } catch (err) {
      console.error("Error saving roadmap:", err);
    }
  };

  const generateRoadmap = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillLevel,
          availableHours,
          timelineMonths,
          targetCompanies,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate roadmap.");
      }

      const newRoadmapWeeks = (data.roadmap.weeks || []).map((week: any) => ({
        ...week,
        tasks: (week.tasks || []).map((task: any) => ({
          ...task,
          done: false, // Ensure they start unchecked
        })),
      }));

      const finalRoadmap = {
        ...data.roadmap,
        weeks: newRoadmapWeeks,
      };

      setRoadmapData(finalRoadmap);
      setCompletedTasks({}); // Reset checkmarks
      setShowSetup(false);

      // Save to Supabase DB
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (roadmapId) {
          const { error: updateErr } = await supabase
            .from("roadmap_plans")
            .update({
              target_companies: targetCompanies,
              skill_level: skillLevel,
              available_hours: availableHours,
              timeline_months: timelineMonths,
              weeks: newRoadmapWeeks,
              progress: 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", roadmapId);
          if (updateErr) throw updateErr;
        } else {
          const { data: inserted, error: insertErr } = await supabase
            .from("roadmap_plans")
            .insert({
              user_id: user.id,
              target_companies: targetCompanies,
              skill_level: skillLevel,
              available_hours: availableHours,
              timeline_months: timelineMonths,
              weeks: newRoadmapWeeks,
              progress: 0,
            })
            .select();
          if (insertErr) throw insertErr;
          if (inserted && inserted.length > 0) {
            setRoadmapId(inserted[0].id);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred generating your roadmap.");
    } finally {
      setGenerating(false);
    }
  };

  // If no roadmap data is loaded yet, use the static placeholder or fallback
  const currentRoadmap = roadmapData || {
    title: "Your Placement Roadmap",
    weeks: roadmapWeeks,
  };

  // Dynamic progress calculator based on local checkbox states
  const totalTasksCount = currentRoadmap.weeks.reduce((acc: number, w: any) => acc + (w.tasks?.length || 0), 0);
  const completedCount = Object.values(completedTasks).filter(Boolean).length;
  
  // Calculate progress percent
  const calculatedProgress = totalTasksCount > 0 
    ? Math.round((completedCount / totalTasksCount) * 100) 
    : 0;

  const toggleTaskLocal = async (weekIdx: number, taskIdx: number) => {
    const key = `${weekIdx}-${taskIdx}`;
    const nextVal = !completedTasks[key];
    
    // Update local checkmarks map
    const newCompletedTasks = {
      ...completedTasks,
      [key]: nextVal,
    };
    setCompletedTasks(newCompletedTasks);

    // Update the done status of the task inside weeks array
    const updatedWeeks = currentRoadmap.weeks.map((week: any, wIdx: number) => {
      if (wIdx !== weekIdx) return week;
      const updatedTasks = (week.tasks || []).map((task: any, tIdx: number) => {
        if (tIdx !== taskIdx) return task;
        return {
          ...task,
          done: nextVal,
        };
      });
      return {
        ...week,
        tasks: updatedTasks,
      };
    });

    setRoadmapData({
      ...currentRoadmap,
      weeks: updatedWeeks,
    });

    // Compute new progress percentage
    const totalT = updatedWeeks.reduce((acc: number, w: any) => acc + (w.tasks?.length || 0), 0);
    const completedT = Object.values(newCompletedTasks).filter(Boolean).length;
    const progressPct = totalT > 0 ? Math.round((completedT / totalT) * 100) : 0;

    // Save update to Supabase
    await saveRoadmapState(updatedWeeks, progressPct);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-400">
          <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
            <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white font-sans">Loading placement plan...</h2>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-400">
          <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
            <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white font-sans">Compiling RAG Roadmap...</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Searching databases for {targetCompanies.join(", ")} hiring patterns and syllabus...
        </p>
      </div>
    );
  }

  if (showSetup) {
    return (
      <div className="space-y-6 animate-fade-in max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-white">Generate New Roadmap</h1>
          <p className="text-gray-400 mt-1">Our RAG system creates a plan based on real company hiring patterns.</p>
        </div>

        {error && (
          <div className="p-4 bg-error-500/10 border border-error-500/20 text-error-400 text-sm rounded-xl">
            {error}
          </div>
        )}

        <div className="glass-card rounded-xl p-6 space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Target Companies (Select multiple)</label>
            <div className="flex flex-wrap gap-2">
              {["TCS", "Infosys", "Wipro", "Google", "Microsoft", "Amazon", "Adobe", "Flipkart"].map((c) => {
                const isSelected = targetCompanies.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCompany(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      isSelected
                        ? "gradient-bg text-white border-transparent shadow-lg shadow-primary-500/10"
                        : "bg-white/5 text-gray-400 hover:bg-white/10 border-transparent"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Current Skill Level</label>
            <div className="flex gap-3">
              {["Beginner", "Intermediate", "Advanced"].map((level) => {
                const isSelected = skillLevel === level;
                return (
                  <button
                    key={level}
                    onClick={() => setSkillLevel(level)}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border ${
                      isSelected
                        ? "gradient-bg text-white border-transparent shadow-lg shadow-primary-500/10"
                        : "bg-white/5 text-gray-400 border-white/5 hover:border-primary-500/30"
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">
              Available Hours / Week: <span className="text-primary-400 font-semibold">{availableHours} hrs</span>
            </label>
            <input
              type="range"
              min="5"
              max="40"
              value={availableHours}
              onChange={(e) => setAvailableHours(Number(e.target.value))}
              className="w-full accent-primary-500 bg-white/5 rounded-lg h-2"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5 hrs</span><span>20 hrs</span><span>40 hrs</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Timeline Duration</label>
            <div className="flex gap-3">
              {[
                { label: "1 Month", val: 1 },
                { label: "3 Months", val: 3 },
                { label: "6 Months", val: 6 },
              ].map((t) => {
                const isSelected = timelineMonths === t.val;
                return (
                  <button
                    key={t.val}
                    onClick={() => setTimelineMonths(t.val)}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border ${
                      isSelected
                        ? "gradient-bg text-white border-transparent shadow-lg shadow-primary-500/10"
                        : "bg-white/5 text-gray-400 border-white/5 hover:border-primary-500/30"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowSetup(false)}
              className="flex-1 py-4 bg-white/5 text-gray-400 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button onClick={generateRoadmap} className="flex-1 btn-primary py-4">
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Generate Plan
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{currentRoadmap.title || "Your Placement Roadmap"}</h1>
          <p className="text-gray-400 mt-1">
            Personalized for {targetCompanies.join(", ")} • {timelineMonths} month schedule
          </p>
        </div>
        <button onClick={() => setShowSetup(true)} className="btn-secondary text-sm px-4 py-2">
          Configure Plan
        </button>
      </div>

      {/* Overall Progress */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Overall Progress</h3>
          <span className="text-2xl font-bold gradient-text">{calculatedProgress}%</span>
        </div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full gradient-bg rounded-full transition-all duration-500"
            style={{ width: `${calculatedProgress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Completed {completedCount} of {totalTasksCount} tasks ({timelineMonths} month plan)
        </p>
      </div>

      {/* Weekly Timeline */}
      <div className="space-y-4">
        {currentRoadmap.weeks.map((week: any, wIdx: number) => {
          // Calculate progress percentage of this week dynamically
          const weekTasks = week.tasks || [];
          const weekCompleted = weekTasks.filter((_: any, tIdx: number) => completedTasks[`${wIdx}-${tIdx}`]).length;
          const weekProgress = weekTasks.length > 0 
            ? Math.round((weekCompleted / weekTasks.length) * 100) 
            : 0;

          return (
            <div key={wIdx} className="glass-card rounded-xl p-5 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                      weekProgress === 100
                        ? "bg-success-500/20 text-success-400"
                        : weekProgress > 0
                        ? "gradient-bg text-white"
                        : "bg-white/5 text-gray-500"
                    }`}
                  >
                    W{week.week || wIdx + 1}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">{week.theme || week.title}</h3>
                    <p className="text-xs text-gray-500">{week.focus || week.goals?.join(", ")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        weekProgress === 100 ? "bg-success-500" : "gradient-bg"
                      }`}
                      style={{ width: `${weekProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{weekProgress}%</span>
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-2">
                {weekTasks.map((task: any, tIdx: number) => {
                  const taskKey = `${wIdx}-${tIdx}`;
                  const isChecked = !!completedTasks[taskKey];
                  return (
                    <div key={tIdx} className="flex items-start gap-3 py-2 border-b border-white/[0.02] last:border-0">
                      <button
                        onClick={() => toggleTaskLocal(wIdx, tIdx)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          isChecked
                            ? "bg-success-500/20 border-success-400 text-success-400"
                            : "border-gray-600 hover:border-gray-400"
                        }`}
                      >
                        {isChecked && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1">
                        <span className={`text-sm ${isChecked ? "text-gray-500 line-through" : "text-gray-300"}`}>
                          {task.title || task.task}
                        </span>
                        {task.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                        )}
                        
                        {/* Resources links */}
                        {task.resources && task.resources.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {task.resources.map((res: any, rIdx: number) => (
                              <a
                                key={rIdx}
                                href={res.url || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-2 py-0.5 rounded border border-white/5 transition-colors"
                              >
                                <span>🔗 {res.title}</span>
                                <span className="text-gray-600 uppercase text-[8px] font-bold">({res.type || "link"})</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right metadata badges */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          typeColors[task.type] || "bg-white/5 text-gray-400"
                        }`}>
                          {task.type || "Practice"}
                        </span>
                        <span className="text-[9px] text-gray-600 font-mono">
                          {task.estimatedHours || 2}h
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
