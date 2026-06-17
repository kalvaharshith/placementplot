"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/* ───────── Toggle Switch ───────── */
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none ${
        checked ? "gradient-bg" : "bg-white/10"
      }`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${
          checked ? "translate-x-5.5" : "translate-x-0.5"
        }`}
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

/* ───────── Settings Section ───────── */
function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="space-y-4 divide-y divide-white/5">{children}</div>
    </div>
  );
}

/* ───────── Settings Row ───────── */
function SettingsRow({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between pt-4 first:pt-0">
      <div className="flex-1 pr-8">
        <p className="text-sm font-medium text-gray-200">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

/* ───────── Main Page ───────── */
export default function SettingsPage() {
  // Profile
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [college, setCollege] = useState("");
  const [targetRole, setTargetRole] = useState("SDE");
  const [graduationYear, setGraduationYear] = useState("2026");
  const [loading, setLoading] = useState(true);

  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [roadmapReminders, setRoadmapReminders] = useState(true);
  const [newQuestions, setNewQuestions] = useState(false);

  // AI Preferences
  const [interviewDifficulty, setInterviewDifficulty] = useState("Medium");
  const [responseDetail, setResponseDetail] = useState("Detailed");

  // Privacy
  const [publicProfile, setPublicProfile] = useState(false);
  const [dataSharingConsent, setDataSharingConsent] = useState(true);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email || "");
          
          // Fetch from profiles
          const { data: profile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", user.id)
            .single();

          setName(profile?.name || user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Student User");
          setCollege(user.user_metadata?.college || "");
          setTargetRole(user.user_metadata?.targetRole || "SDE");
          setGraduationYear(user.user_metadata?.year || "2026");
        }
      } catch (err) {
        console.error("Error loading user profile details:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg("");
    setSaved(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated session found.");

      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          name: name,
          college: college,
          targetRole: targetRole,
          year: graduationYear,
        }
      });
      if (authError) throw authError;

      // Update public profile DB table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ name: name })
        .eq("id", user.id);
      if (profileError) throw profileError;

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        // Refresh to update sidebar details
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
        <svg className="w-8 h-8 text-primary-400 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
          <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <p className="text-sm text-gray-500 mt-2">Loading profile settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">
            Manage your profile, preferences, and account settings.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`btn-primary text-sm px-5 py-2.5 flex items-center gap-2 ${
            saved ? "bg-success-500" : ""
          }`}
        >
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span>Saving...</span>
            </>
          ) : saved ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>Saved!</span>
            </>
          ) : (
            <span>Save Changes</span>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs text-center animate-fade-in">
          {errorMsg}
        </div>
      )}

      {/* Profile Settings */}
      <SettingsSection
        title="Profile"
        description="Your personal information and academic details."
      >
        {/* Avatar */}
        <div className="flex items-center gap-4 pb-4 border-b border-white/5">
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-primary-500/20">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{name}</p>
            <p className="text-xs text-gray-500">{email}</p>
            <button className="text-xs text-primary-400 hover:text-primary-300 mt-1 transition-colors">
              Change avatar
            </button>
          </div>
        </div>

        <SettingsRow
          label="Display Name"
          description="Your name shown across the platform."
          control={
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-44 px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-primary-500/50 transition-colors"
            />
          }
        />

        <SettingsRow
          label="Email"
          description="Your login email address."
          control={
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">{email}</span>
              <span className="text-[10px] font-bold bg-success-500/20 text-success-400 px-2 py-0.5 rounded">Verified</span>
            </div>
          }
        />

        <SettingsRow
          label="College / University"
          control={
            <input
              type="text"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className="w-44 px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-primary-500/50 transition-colors"
            />
          }
        />

        <SettingsRow
          label="Target Role"
          control={
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-44 px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-primary-500/50 transition-colors"
            >
              {["SDE", "Data Analyst", "ML Engineer", "DevOps", "Product Manager", "Business Analyst"].map((role) => (
                <option key={role} value={role} className="bg-surface-900">
                  {role}
                </option>
              ))}
            </select>
          }
        />

        <SettingsRow
          label="Graduation Year"
          control={
            <select
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              className="w-44 px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-primary-500/50 transition-colors"
            >
              {["2025", "2026", "2027", "2028"].map((yr) => (
                <option key={yr} value={yr} className="bg-surface-900">
                  {yr}
                </option>
              ))}
            </select>
          }
        />
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        title="Notifications"
        description="Choose which updates you want to receive."
      >
        <SettingsRow
          label="Email Notifications"
          description="Receive important account notifications via email."
          control={<Toggle checked={emailNotifs} onChange={setEmailNotifs} />}
        />
        <SettingsRow
          label="Weekly Progress Report"
          description="Get a weekly summary of your placement readiness scores."
          control={<Toggle checked={weeklyReport} onChange={setWeeklyReport} />}
        />
        <SettingsRow
          label="Roadmap Reminders"
          description="Daily reminders to complete your study plan tasks."
          control={<Toggle checked={roadmapReminders} onChange={setRoadmapReminders} />}
        />
        <SettingsRow
          label="New Company Questions"
          description="Notify when new interview questions are added for your target companies."
          control={<Toggle checked={newQuestions} onChange={setNewQuestions} />}
        />
      </SettingsSection>

      {/* AI Preferences */}
      <SettingsSection
        title="AI Preferences"
        description="Customize how the AI interacts with you."
      >
        <SettingsRow
          label="Default Interview Difficulty"
          description="The starting difficulty level when setting up a new mock interview."
          control={
            <div className="flex gap-1.5">
              {["Easy", "Medium", "Hard"].map((d) => (
                <button
                  key={d}
                  onClick={() => setInterviewDifficulty(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    interviewDifficulty === d
                      ? "gradient-bg text-white shadow-lg shadow-primary-500/20"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          }
        />
        <SettingsRow
          label="AI Response Detail"
          description="How verbose and detailed the AI's feedback should be."
          control={
            <div className="flex gap-1.5">
              {["Concise", "Detailed"].map((d) => (
                <button
                  key={d}
                  onClick={() => setResponseDetail(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    responseDetail === d
                      ? "gradient-bg text-white shadow-lg shadow-primary-500/20"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          }
        />
      </SettingsSection>

      {/* Privacy */}
      <SettingsSection
        title="Privacy & Data"
        description="Control your data and privacy settings."
      >
        <SettingsRow
          label="Public Profile"
          description="Allow other students to view your placement progress (anonymous)."
          control={<Toggle checked={publicProfile} onChange={setPublicProfile} />}
        />
        <SettingsRow
          label="Data Usage Consent"
          description="Allow your anonymized resume patterns to improve our RAG knowledge base."
          control={<Toggle checked={dataSharingConsent} onChange={setDataSharingConsent} />}
        />
        <div className="pt-4">
          <p className="text-xs text-gray-500 mb-3">
            Your data is encrypted with enterprise-grade security via Supabase. We never share personal data with third parties.
          </p>
          <div className="flex gap-3">
            <button className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
              Download my data
            </button>
            <span className="text-gray-700">•</span>
            <button className="text-xs text-error-400 hover:text-error-300 transition-colors">
              Delete my account
            </button>
          </div>
        </div>
      </SettingsSection>

      {/* Danger Zone */}
      <div className="rounded-2xl p-6 border border-error-500/20 bg-error-500/[0.02] space-y-4">
        <h2 className="text-base font-semibold text-error-400">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Reset all progress</p>
            <p className="text-xs text-gray-500">
              Clear all analyses, interview history, and roadmap progress. This cannot be undone.
            </p>
          </div>
          <button className="px-4 py-2 rounded-lg text-xs font-semibold bg-error-500/10 text-error-400 border border-error-500/20 hover:bg-error-500/20 transition-all">
            Reset Progress
          </button>
        </div>
        <div className="flex items-center justify-between border-t border-error-500/10 pt-4">
          <div>
            <p className="text-sm font-medium text-white">Delete account</p>
            <p className="text-xs text-gray-500">
              Permanently delete your account and all associated data. This is irreversible.
            </p>
          </div>
          <button className="px-4 py-2 rounded-lg text-xs font-semibold bg-error-500/10 text-error-400 border border-error-500/20 hover:bg-error-500/20 transition-all">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
