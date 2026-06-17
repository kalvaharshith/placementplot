"use client";

import { useState } from "react";
import PaymentButton from "@/features/payment/PaymentButton";

/* ───────── Plan Badge ───────── */
function PlanBadge({ plan }: { plan: "free" | "premium" }) {
  if (plan === "premium") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold gradient-bg text-white shadow-lg shadow-primary-500/20">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        Premium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-gray-300 border border-white/10">
      Free Plan
    </span>
  );
}

/* ───────── Usage Bar ───────── */
function UsageBar({
  label,
  used,
  total,
  icon,
}: {
  label: string;
  used: number;
  total: number | "unlimited";
  icon: React.ReactNode;
}) {
  const pct = total === "unlimited" ? 100 : Math.min((used / (total as number)) * 100, 100);
  const remaining = total === "unlimited" ? "∞" : (total as number) - used;
  const isLow = total !== "unlimited" && pct >= 80;
  const colorClass = total === "unlimited" ? "gradient-bg" : isLow ? "bg-error-500" : "gradient-bg";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400">
            {icon}
          </div>
          <span className="text-sm font-medium text-gray-300">{label}</span>
        </div>
        <span className="text-sm text-gray-400">
          <span className="text-white font-semibold">{used}</span>
          {" / "}
          <span>{total === "unlimited" ? "∞" : total}</span>
          {" used"}
        </span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        {total === "unlimited"
          ? "Unlimited — Premium plan"
          : isLow
          ? `⚠️ Only ${remaining} remaining — consider upgrading`
          : `${remaining} remaining`}
      </p>
    </div>
  );
}

/* ───────── Invoice Row ───────── */
function InvoiceRow({
  date,
  description,
  amount,
  status,
}: {
  date: string;
  description: string;
  amount: string;
  status: "paid" | "pending";
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-white">{description}</p>
          <p className="text-xs text-gray-500">{date}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-white">{amount}</span>
        <span
          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
            status === "paid"
              ? "bg-success-500/20 text-success-400"
              : "bg-warning-500/20 text-warning-400"
          }`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

/* ───────── Main Page ───────── */
export default function BillingPage() {
  const [currentPlan] = useState<"free" | "premium">("premium");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Mock usage data — replace with real Supabase data fetch
  const usage = {
    resumeUsed: 1,
    resumeTotal: 2,
    interviewUsed: 0,
    interviewTotal: 1,
  };

  const isPremium = currentPlan === "premium";

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Billing & Plan</h1>
        <p className="text-gray-400 mt-1">
          Manage your subscription, usage, and payment history.
        </p>
      </div>

      {/* Current Plan Card */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-primary-500/10 to-accent-500/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-semibold text-white">Current Plan</h2>
                <PlanBadge plan={currentPlan} />
              </div>
              <p className="text-sm text-gray-400">
                {isPremium
                  ? "Unlimited access to all AI-powered features."
                  : "You're on the free tier. Upgrade to unlock unlimited access."}
              </p>
            </div>
            {isPremium ? (
              <div className="text-right">
                <p className="text-2xl font-bold text-white">₹149</p>
                <p className="text-xs text-gray-500">per month</p>
                <p className="text-xs text-success-400 mt-1">Next billing: July 15, 2026</p>
              </div>
            ) : (
              <div className="text-right">
                <p className="text-2xl font-bold text-white">₹0</p>
                <p className="text-xs text-gray-500">forever</p>
              </div>
            )}
          </div>

          {/* Plan Features */}
          {!isPremium && (
            <div className="grid sm:grid-cols-3 gap-3 mb-6">
              {[
                { label: "2 Resume Analyses", included: true },
                { label: "1 Mock Interview", included: true },
                { label: "Unlimited Analyses", included: false },
                { label: "All Company Questions", included: false },
                { label: "Bullet Enhancer", included: false },
                { label: "Priority Support", included: false },
              ].map((feature, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm ${feature.included ? "text-gray-300" : "text-gray-600"}`}>
                  {feature.included ? (
                    <svg className="w-4 h-4 text-success-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {feature.label}
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3">
            {!isPremium ? (
              <>
                <PaymentButton itemType="subscription" className="btn-primary px-6 py-3 text-sm">
                  <span>Upgrade to Premium — ₹149/month</span>
                </PaymentButton>
                <PaymentButton itemType="pack" className="btn-secondary px-6 py-3 text-sm">
                  <span>Buy Interview Pack — ₹99/company</span>
                </PaymentButton>
              </>
            ) : (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="btn-secondary text-sm px-5 py-2.5 text-error-400 border-error-500/20 hover:border-error-500/40"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="glass-card rounded-2xl p-6 space-y-6">
        <h2 className="text-lg font-semibold text-white">Usage This Month</h2>
        <div className="space-y-6">
          <UsageBar
            label="Resume Analyses"
            used={usage.resumeUsed}
            total={isPremium ? "unlimited" : usage.resumeTotal}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            }
          />
          <UsageBar
            label="Mock Interviews"
            used={usage.interviewUsed}
            total={isPremium ? "unlimited" : usage.interviewTotal}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Plans Comparison */}
      {!isPremium && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Compare Plans</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {/* Free */}
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
              <div>
                <h3 className="font-semibold text-white">Free</h3>
                <p className="text-2xl font-bold text-white mt-1">₹0</p>
                <p className="text-xs text-gray-500">forever</p>
              </div>
              <ul className="space-y-2 text-xs text-gray-400">
                <li>• 2 Resume Analyses</li>
                <li>• 1 Mock Interview</li>
                <li>• 5 questions / company</li>
                <li>• Basic ATS Score</li>
              </ul>
              <div className="pt-2">
                <span className="text-xs text-success-400 font-semibold">✓ Current Plan</span>
              </div>
            </div>

            {/* Premium */}
            <div className="relative p-[1px] rounded-xl bg-gradient-to-b from-primary-500 to-accent-500">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-bg text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                MOST POPULAR
              </div>
              <div className="p-5 rounded-xl bg-surface-900 space-y-4 h-full">
                <div>
                  <h3 className="font-semibold text-white">Premium</h3>
                  <p className="text-2xl font-bold text-white mt-1">₹149</p>
                  <p className="text-xs text-gray-500">/month</p>
                </div>
                <ul className="space-y-2 text-xs text-gray-300">
                  <li>• Unlimited Resume Analyses</li>
                  <li>• Unlimited Mock Interviews</li>
                  <li>• All 30+ Company Questions</li>
                  <li>• Bullet Enhancer</li>
                  <li>• Personalized Roadmap</li>
                  <li>• RAG-powered precision</li>
                </ul>
                <PaymentButton itemType="subscription" className="btn-primary w-full text-xs py-2.5">
                  <span>Upgrade Now</span>
                </PaymentButton>
              </div>
            </div>

            {/* Interview Pack */}
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
              <div>
                <h3 className="font-semibold text-white">Interview Pack</h3>
                <p className="text-2xl font-bold text-white mt-1">₹99</p>
                <p className="text-xs text-gray-500">/company</p>
              </div>
              <ul className="space-y-2 text-xs text-gray-400">
                <li>• 50+ Company Questions</li>
                <li>• Model Answers with RAG</li>
                <li>• Hiring Process Breakdown</li>
                <li>• Custom Mock Interview</li>
              </ul>
              <PaymentButton itemType="pack" className="btn-secondary w-full text-xs py-2.5">
                <span>Buy Pack</span>
              </PaymentButton>
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Payment History</h2>
        {isPremium ? (
          <div className="divide-y divide-white/5">
            <InvoiceRow
              date="Jun 15, 2026"
              description="Premium Plan — Monthly"
              amount="₹149"
              status="paid"
            />
            <InvoiceRow
              date="May 15, 2026"
              description="Premium Plan — Monthly"
              amount="₹149"
              status="paid"
            />
            <InvoiceRow
              date="Apr 15, 2026"
              description="Premium Plan — Monthly"
              amount="₹149"
              status="paid"
            />
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No transactions yet.</p>
            <p className="text-gray-600 text-xs mt-1">Upgrade to Premium to see your billing history here.</p>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-surface-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card rounded-2xl p-6 max-w-sm w-full border border-error-500/20 shadow-2xl animate-scale-in text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-error-500/10 flex items-center justify-center mx-auto text-error-400">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Cancel Subscription?</h3>
              <p className="text-xs text-gray-400 mt-1">
                You'll lose unlimited access immediately. Your free tier limits will be restored.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold btn-secondary"
              >
                Keep Premium
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-error-500/10 text-error-400 border border-error-500/20 hover:bg-error-500/20 transition-all"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
