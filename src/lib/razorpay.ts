import Razorpay from "razorpay";

// ─── Razorpay Client ────────────────────────────────────────────

let razorpayInstance: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error("Razorpay API keys are not configured");
    }

    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return razorpayInstance;
}

// ─── Subscription Plans ────────────────────────────────────────

export const PLANS = {
  premium: {
    name: "Premium",
    amount: 14900, // ₹149 in paise
    currency: "INR",
    period: "monthly",
    description: "Unlimited access to all AI-powered features",
    features: [
      "Unlimited Resume Analyses",
      "Unlimited Mock Interviews",
      "Full Placement Roadmap",
      "All 30+ Company Questions",
      "Resume Bullet Enhancer",
      "RAG-powered precision",
      "Priority support",
    ],
  },
} as const;

export const INTERVIEW_PACK_PRICE = 9900; // ₹99 in paise

// ─── Verify Webhook Signature ──────────────────────────────────

export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const crypto = require("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || "")
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

// ─── Types ─────────────────────────────────────────────────────

export type UserTier = "free" | "premium";

export interface TierLimits {
  resumeAnalyses: number;
  mockInterviews: number;
  questionsPerCompany: number;
  hasRoadmap: boolean;
  hasBulletEnhancer: boolean;
}

export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    resumeAnalyses: 2,
    mockInterviews: 1,
    questionsPerCompany: 5,
    hasRoadmap: false,
    hasBulletEnhancer: false,
  },
  premium: {
    resumeAnalyses: Infinity,
    mockInterviews: Infinity,
    questionsPerCompany: Infinity,
    hasRoadmap: true,
    hasBulletEnhancer: true,
  },
};
