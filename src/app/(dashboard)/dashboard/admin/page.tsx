"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

interface DocumentItem {
  id: string;
  content: string;
  metadata: Record<string, any>;
  kb_type: string;
  created_at: string;
}

interface UserItem {
  id: string;
  name: string;
  avatar_url: string | null;
  college: string;
  year: number;
  branch: string;
  tier: string;
  resume_credits: number;
  interview_credits: number;
  created_at: string;
  updated_at: string;
  resumeCount: number;
  interviewCount: number;
}

interface UserDetail {
  profile: UserItem;
  activity: {
    resumes: any[];
    interviews: any[];
    roadmap: any | null;
  };
}

/* ═══════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════ */

const kbTypeOptions = [
  { value: "interview_bank", label: "Interview Bank" },
  { value: "company_profiles", label: "Company Profiles" },
  { value: "ats_rules", label: "ATS Rules" },
  { value: "resume_examples", label: "Resume Examples" },
  { value: "learning_resources", label: "Learning Resources" },
];

const badgeColorMap: Record<string, string> = {
  interview_bank: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  company_profiles: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  ats_rules: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  resume_examples: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  learning_resources: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const tabs = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "users", label: "Users", icon: "👥" },
  { id: "content", label: "Content", icon: "📚" },
  { id: "upload", label: "Upload", icon: "⬆️" },
] as const;

type TabId = (typeof tabs)[number]["id"];

/* ═══════════════════════════════════════════════════════════════
   Admin Page
   ═══════════════════════════════════════════════════════════════ */

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // ─── Check Authorization ───
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (user) {
          setUserToken(session.access_token);
          const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "kalvaharshith@gmail.com";
          setAuthorized(user.email === adminEmail);
        } else {
          setAuthorized(false);
        }
      } catch {
        setAuthorized(false);
      }
    };
    checkAdmin();
  }, []);

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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
          <svg className="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          Admin Console
        </h1>
        <p className="text-gray-400 mt-1">Manage users, content, and system resources.</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-white/[0.02] p-1 rounded-xl border border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "gradient-bg text-white shadow-lg shadow-primary-500/10"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab token={userToken!} />}
      {activeTab === "users" && <UsersTab token={userToken!} />}
      {activeTab === "content" && <ContentTab token={userToken!} />}
      {activeTab === "upload" && <UploadTab token={userToken!} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   OVERVIEW TAB
   ═══════════════════════════════════════════════════════════════ */

function OverviewTab({ token }: { token: string }) {
  const [stats, setStats] = useState<any>(null);
  const [kbBreakdown, setKbBreakdown] = useState<Record<string, number>>({});
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentInterviews, setRecentInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
          setKbBreakdown(data.kbBreakdown || {});
          setRecentUsers(data.recentUsers || []);
          setRecentInterviews(data.recentInterviews || []);
        }
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const statCards = [
    { label: "Total Users", value: stats?.users ?? "...", icon: "👥", color: "text-blue-400 border-blue-500/20 bg-blue-500/5", sub: `${stats?.premiumUsers || 0} premium` },
    { label: "Resumes Analyzed", value: stats?.resumes ?? "...", icon: "📄", color: "text-purple-400 border-purple-500/20 bg-purple-500/5", sub: "Total uploads" },
    { label: "Mock Interviews", value: stats?.interviews ?? "...", icon: "💬", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5", sub: "Sessions completed" },
    { label: "Vector Documents", value: stats?.documents ?? "...", icon: "🗃️", color: "text-amber-400 border-amber-500/20 bg-amber-500/5", sub: "Embedded chunks" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`glass-card rounded-xl p-5 border ${card.color}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{card.label}</span>
              <span className="text-xl">{card.icon}</span>
            </div>
            <p className="text-3xl font-extrabold text-white">{card.value}</p>
            <p className="text-[11px] text-gray-500 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* KB Breakdown */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-base font-semibold text-white mb-4">Knowledge Base Breakdown</h3>
          <div className="space-y-3">
            {kbTypeOptions.map((kb) => {
              const count = kbBreakdown[kb.value] || 0;
              const total = stats?.documents || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={kb.value}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${badgeColorMap[kb.value] || "bg-white/5 text-gray-400"}`}>
                      {kb.label}
                    </span>
                    <span className="text-xs text-gray-400">{count} docs ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full gradient-bg rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          {/* Recent Users */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Recent Signups</h3>
            <div className="space-y-2">
              {loading ? (
                <p className="text-xs text-gray-500">Loading...</p>
              ) : recentUsers.length === 0 ? (
                <p className="text-xs text-gray-500">No users yet.</p>
              ) : (
                recentUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
                    <div>
                      <p className="text-sm text-white">{u.name || "Unknown"}</p>
                      <p className="text-[10px] text-gray-500">{u.college || "—"}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${u.tier === "premium" ? "bg-accent-500/20 text-accent-400" : "bg-white/5 text-gray-500"}`}>
                      {u.tier || "free"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Interviews */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Recent Interviews</h3>
            <div className="space-y-2">
              {loading ? (
                <p className="text-xs text-gray-500">Loading...</p>
              ) : recentInterviews.length === 0 ? (
                <p className="text-xs text-gray-500">No interviews yet.</p>
              ) : (
                recentInterviews.map((i: any) => (
                  <div key={i.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
                    <div>
                      <p className="text-sm text-white">{i.company} — {i.round}</p>
                    </div>
                    <span className={`text-xs font-bold ${(i.score || 0) >= 70 ? "text-success-400" : (i.score || 0) >= 50 ? "text-warning-400" : "text-error-400"}`}>
                      {i.score ?? "—"}/100
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   USERS TAB
   ═══════════════════════════════════════════════════════════════ */

function UsersTab({ token }: { token: string }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editForm, setEditForm] = useState({ tier: "", resume_credits: 0, interview_credits: 0 });
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", tier: tierFilter });
      if (search.trim()) params.set("search", search);
      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }, [token, page, search, tierFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleViewUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSelectedUser(data);
      }
    } catch (err) {
      console.error("Failed to load user detail:", err);
    }
  };

  const handleEditUser = (user: UserItem) => {
    setEditingUser(user);
    setEditForm({
      tier: user.tier || "free",
      resume_credits: user.resume_credits || 0,
      interview_credits: user.interview_credits || 0,
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        setEditingUser(null);
        loadUsers();
      }
    } catch (err) {
      console.error("Failed to update user:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or college..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-primary-500/50"
          />
        </div>
        <div className="flex gap-2">
          {["all", "free", "premium"].map((t) => (
            <button
              key={t}
              onClick={() => { setTierFilter(t); setPage(1); }}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tierFilter === t ? "gradient-bg text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{total} users found</span>
        <span>Page {page} of {totalPages}</span>
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">User</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase hidden md:table-cell">College</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Tier</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase hidden sm:table-cell">Credits</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase hidden lg:table-cell">Activity</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">No users found.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {(user.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{user.name || "Unknown"}</p>
                          <p className="text-[10px] text-gray-500">{user.branch || "—"} • Y{user.year || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400 hidden md:table-cell">{user.college || "—"}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        user.tier === "premium" ? "bg-accent-500/20 text-accent-400" : "bg-white/5 text-gray-500"
                      }`}>
                        {user.tier || "free"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center hidden sm:table-cell">
                      <span className="text-[10px] text-gray-400">R:{user.resume_credits} I:{user.interview_credits}</span>
                    </td>
                    <td className="py-3 px-4 text-center hidden lg:table-cell">
                      <span className="text-[10px] text-gray-400">{user.resumeCount}📄 {user.interviewCount}💬</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleViewUser(user.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-primary-400 hover:bg-primary-500/10 transition-all"
                          title="View details"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-warning-400 hover:bg-warning-500/10 transition-all"
                          title="Edit user"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-sm disabled:opacity-30 hover:bg-white/10">← Prev</button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = page <= 3 ? i + 1 : page + i - 2;
            if (p < 1 || p > totalPages) return null;
            return (
              <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium ${p === page ? "gradient-bg text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>{p}</button>
            );
          })}
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-sm disabled:opacity-30 hover:bg-white/10">Next →</button>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setSelectedUser(null)}>
          <div className="glass-card rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto border border-white/10 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">User Profile</h3>
              <button onClick={() => setSelectedUser(null)} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10">✕</button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center text-lg font-bold text-white">
                  {(selectedUser.profile.name || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-semibold">{selectedUser.profile.name || "Unknown"}</p>
                  <p className="text-xs text-gray-500">{selectedUser.profile.college || "—"} • {selectedUser.profile.branch || "—"} • Y{selectedUser.profile.year || "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-white">{selectedUser.activity.resumes.length}</p>
                  <p className="text-[10px] text-gray-500">Resumes</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-white">{selectedUser.activity.interviews.length}</p>
                  <p className="text-[10px] text-gray-500">Interviews</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-white">{selectedUser.activity.roadmap?.progress || 0}%</p>
                  <p className="text-[10px] text-gray-500">Roadmap</p>
                </div>
              </div>

              {selectedUser.activity.interviews.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Recent Interviews</h4>
                  <div className="space-y-1.5">
                    {selectedUser.activity.interviews.slice(0, 5).map((i: any) => (
                      <div key={i.id} className="flex justify-between bg-white/[0.02] rounded-lg px-3 py-2">
                        <span className="text-xs text-gray-300">{i.company} — {i.round}</span>
                        <span className={`text-xs font-bold ${(i.score || 0) >= 70 ? "text-success-400" : "text-warning-400"}`}>{i.score}/100</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedUser.activity.resumes.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Resume Uploads</h4>
                  <div className="space-y-1.5">
                    {selectedUser.activity.resumes.slice(0, 5).map((r: any) => (
                      <div key={r.id} className="flex justify-between bg-white/[0.02] rounded-lg px-3 py-2">
                        <span className="text-xs text-gray-300 truncate max-w-[200px]">{r.file_name}</span>
                        <span className={`text-xs font-bold ${(r.ats_score || 0) >= 70 ? "text-success-400" : "text-warning-400"}`}>{r.ats_score}/100</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setEditingUser(null)}>
          <div className="glass-card rounded-2xl p-6 max-w-md w-full border border-white/10 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Edit User</h3>
              <button onClick={() => setEditingUser(null)} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10">✕</button>
            </div>

            <p className="text-sm text-gray-400 mb-4">{editingUser.name} — {editingUser.college || "No college"}</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase">Tier</label>
                <div className="flex gap-2">
                  {["free", "premium"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setEditForm({ ...editForm, tier: t })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        editForm.tier === t ? "gradient-bg text-white border-transparent" : "bg-white/5 text-gray-400 border-white/5"
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase">Resume Credits</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.resume_credits}
                    onChange={(e) => setEditForm({ ...editForm, resume_credits: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-gray-300 outline-none focus:border-primary-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase">Interview Credits</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.interview_credits}
                    onChange={(e) => setEditForm({ ...editForm, interview_credits: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-gray-300 outline-none focus:border-primary-500/50"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-white/5 text-gray-400 rounded-xl text-sm font-semibold hover:bg-white/10">Cancel</button>
                <button onClick={handleSaveUser} disabled={saving} className="flex-1 btn-primary py-3">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CONTENT TAB
   ═══════════════════════════════════════════════════════════════ */

function ContentTab({ token }: { token: string }) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [kbFilter, setKbFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editDoc, setEditDoc] = useState<DocumentItem | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editMetadata, setEditMetadata] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15", kb_type: kbFilter });
      if (search.trim()) params.set("search", search);
      const res = await fetch(`/api/admin/content?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error("Failed to load content:", err);
    } finally {
      setLoading(false);
    }
  }, [token, page, kbFilter, search]);

  useEffect(() => { loadContent(); }, [loadContent]);

  const handleEdit = (doc: DocumentItem) => {
    setEditDoc(doc);
    setEditContent(doc.content);
    setEditMetadata(JSON.stringify(doc.metadata, null, 2));
  };

  const handleSaveEdit = async () => {
    if (!editDoc) return;
    setSaving(true);
    try {
      let parsedMetadata = {};
      try { parsedMetadata = JSON.parse(editMetadata); } catch { parsedMetadata = editDoc.metadata; }

      const res = await fetch(`/api/admin/content/${editDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: editContent, metadata: parsedMetadata }),
      });
      const data = await res.json();
      if (data.success) {
        setEditDoc(null);
        loadContent();
      } else {
        alert(data.error || "Failed to save.");
      }
    } catch (err) {
      console.error("Failed to save edit:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this resource from the vector store?")) return;
    try {
      const res = await fetch("/api/admin/delete-resource", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      if (res.ok) loadContent();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) return;
    if (!confirm(`Delete ${selectedDocs.size} selected documents?`)) return;
    for (const id of selectedDocs) {
      try {
        await fetch("/api/admin/delete-resource", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id }),
        });
      } catch {}
    }
    setSelectedDocs(new Set());
    loadContent();
  };

  const toggleSelectDoc = (id: string) => {
    const next = new Set(selectedDocs);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedDocs(next);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search content..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-primary-500/50"
          />
        </div>
        {selectedDocs.size > 0 && (
          <button onClick={handleBulkDelete} className="px-4 py-2 rounded-xl bg-error-500/10 text-error-400 text-sm font-medium hover:bg-error-500/20 border border-error-500/20">
            Delete {selectedDocs.size} selected
          </button>
        )}
      </div>

      {/* KB Type Tabs */}
      <div className="flex flex-wrap gap-2">
        {[{ value: "all", label: "All" }, ...kbTypeOptions].map((kb) => (
          <button
            key={kb.value}
            onClick={() => { setKbFilter(kb.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              kbFilter === kb.value
                ? "bg-primary-500/10 border-primary-500/30 text-primary-400"
                : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10"
            }`}
          >
            {kb.label}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="text-xs text-gray-500">{total} documents • Page {page}/{totalPages}</div>

      {/* Document List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading content...</div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No documents found.</div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="glass-card rounded-xl p-4 border border-white/5 group hover:border-white/10 transition-all">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedDocs.has(doc.id)}
                  onChange={() => toggleSelectDoc(doc.id)}
                  className="mt-1 accent-primary-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase ${badgeColorMap[doc.kb_type] || "bg-white/5 text-gray-400 border-white/10"}`}>
                      {doc.kb_type.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(doc)} className="p-1.5 rounded-lg text-gray-500 hover:text-primary-400 hover:bg-primary-500/10" title="Edit">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(doc.id)} className="p-1.5 rounded-lg text-gray-500 hover:text-error-400 hover:bg-error-500/10" title="Delete">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-300 line-clamp-3 leading-relaxed">{doc.content}</p>
                  {Object.keys(doc.metadata).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(doc.metadata).map(([k, v]) => (
                        <span key={k} className="text-[10px] font-mono text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">{k}: {String(v)}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-sm disabled:opacity-30 hover:bg-white/10">← Prev</button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-sm disabled:opacity-30 hover:bg-white/10">Next →</button>
        </div>
      )}

      {/* Edit Document Modal */}
      {editDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setEditDoc(null)}>
          <div className="glass-card rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-white/10 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Edit Document</h3>
              <button onClick={() => setEditDoc(null)} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase">Content</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={10}
                  className="w-full p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm font-mono text-gray-300 outline-none focus:border-primary-500/50 resize-y leading-relaxed"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase">Metadata (JSON)</label>
                <textarea
                  value={editMetadata}
                  onChange={(e) => setEditMetadata(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-white/[0.02] border border-white/10 rounded-xl text-sm font-mono text-gray-300 outline-none focus:border-primary-500/50 resize-y"
                />
              </div>
              <p className="text-[10px] text-gray-500">⚠️ Saving will re-generate the vector embedding for this document.</p>
              <div className="flex gap-3">
                <button onClick={() => setEditDoc(null)} className="flex-1 py-3 bg-white/5 text-gray-400 rounded-xl text-sm font-semibold hover:bg-white/10">Cancel</button>
                <button onClick={handleSaveEdit} disabled={saving} className="flex-1 btn-primary py-3">
                  {saving ? "Re-embedding..." : "Save & Re-embed"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   UPLOAD TAB
   ═══════════════════════════════════════════════════════════════ */

function UploadTab({ token }: { token: string }) {
  const [kbType, setKbType] = useState("interview_bank");
  const [content, setContent] = useState("");
  const [company, setCompany] = useState("");
  const [round, setRound] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [topic, setTopic] = useState("");
  const [source, setSource] = useState("");
  const [url, setUrl] = useState("");
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const buildMetadata = () => {
    const metadata: Record<string, any> = {};
    if (kbType === "interview_bank" || kbType === "company_profiles") {
      if (company) metadata.company = company.toLowerCase().trim();
      if (round) metadata.round = round.trim();
      if (topic) metadata.topic = topic.toLowerCase().trim();
    }
    if (kbType === "interview_bank") {
      if (difficulty) metadata.difficulty = difficulty;
    }
    if (kbType === "ats_rules" || kbType === "learning_resources") {
      if (topic) metadata.topic = topic.toLowerCase().trim();
      if (source) metadata.source = source.trim();
    }
    if (kbType === "learning_resources" && url) metadata.url = url.trim();
    if (kbType === "resume_examples") {
      if (role) metadata.role = role.toLowerCase().trim();
      if (industry) metadata.industry = industry.trim();
    }
    return metadata;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (bulkMode) {
        // Split by --- delimiter
        const items = content.split(/\n---\n/).map(s => s.trim()).filter(Boolean);
        let successCount = 0;
        let errorCount = 0;

        for (const item of items) {
          try {
            const res = await fetch("/api/admin/upload-resource", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ kbType, content: item, metadata: buildMetadata() }),
            });
            if (res.ok) successCount++;
            else errorCount++;
          } catch {
            errorCount++;
          }
        }

        setSuccessMsg(`Bulk upload complete: ${successCount} indexed, ${errorCount} failed.`);
      } else {
        const res = await fetch("/api/admin/upload-resource", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ kbType, content, metadata: buildMetadata() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        setSuccessMsg("Document embedded and indexed successfully!");
      }

      setContent("");
      setCompany(""); setRound(""); setTopic(""); setSource(""); setUrl(""); setRole(""); setIndustry("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="glass-card rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Upload Resource</h2>
          <button
            onClick={() => setBulkMode(!bulkMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              bulkMode ? "bg-primary-500/10 border-primary-500/30 text-primary-400" : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10"
            }`}
          >
            {bulkMode ? "📦 Bulk Mode ON" : "📦 Bulk Mode"}
          </button>
        </div>

        {successMsg && (
          <div className="p-4 bg-success-500/10 border border-success-500/20 text-success-400 text-sm rounded-xl">{successMsg}</div>
        )}
        {errorMsg && (
          <div className="p-4 bg-error-500/10 border border-error-500/20 text-error-400 text-sm rounded-xl">{errorMsg}</div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          {/* KB Type Selector */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Segment Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {kbTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setKbType(opt.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    kbType === opt.value
                      ? "bg-primary-500/10 border-primary-500/30 text-primary-400"
                      : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Metadata Fields */}
          <div className="grid sm:grid-cols-2 gap-4 bg-white/[0.01] p-4 rounded-xl border border-white/5">
            {(kbType === "interview_bank" || kbType === "company_profiles") && (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase">Company</label>
                  <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. TCS, Google" className="w-full px-3 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-700 outline-none focus:border-primary-500/30" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase">Round</label>
                  <input type="text" value={round} onChange={(e) => setRound(e.target.value)} placeholder="e.g. Technical, HR" className="w-full px-3 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-700 outline-none focus:border-primary-500/30" required />
                </div>
              </>
            )}
            {kbType === "interview_bank" && (
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase">Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full px-3 py-2 bg-surface-900 border border-white/10 rounded-lg text-sm text-gray-300 outline-none focus:border-primary-500/30">
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            )}
            {(kbType === "interview_bank" || kbType === "company_profiles" || kbType === "ats_rules" || kbType === "learning_resources") && (
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase">Topic</label>
                <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. OOP, Trees" className="w-full px-3 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-700 outline-none focus:border-primary-500/30" />
              </div>
            )}
            {kbType === "resume_examples" && (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase">Role</label>
                  <input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. SDE" className="w-full px-3 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-700 outline-none focus:border-primary-500/30" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase">Industry</label>
                  <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. FAANG" className="w-full px-3 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-700 outline-none focus:border-primary-500/30" />
                </div>
              </>
            )}
            {(kbType === "ats_rules" || kbType === "learning_resources") && (
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase">Source</label>
                <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. GeeksforGeeks" className="w-full px-3 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-700 outline-none focus:border-primary-500/30" />
              </div>
            )}
            {kbType === "learning_resources" && (
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase">URL</label>
                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-700 outline-none focus:border-primary-500/30" />
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">
              {bulkMode ? "Content (separate entries with ---)" : "Resource Content"}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={bulkMode ? "Entry 1 text here...\n---\nEntry 2 text here...\n---\nEntry 3 text here..." : "Paste the document text content that will be vectorized..."}
              rows={8}
              className="w-full p-4 bg-white/[0.02] border border-white/10 rounded-xl text-sm font-mono text-gray-300 placeholder-gray-700 outline-none focus:border-primary-500/50 resize-y leading-relaxed"
              required
            />
          </div>

          <button type="submit" disabled={loading || !content.trim()} className="w-full btn-primary py-3">
            <span className="flex items-center justify-center gap-2">
              {loading && (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                  <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
              {loading ? "Embedding and indexing..." : bulkMode ? "Bulk Index Resources" : "Index Resource"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
