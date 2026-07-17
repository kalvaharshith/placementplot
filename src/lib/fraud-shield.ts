import { createServerSupabase } from "@/lib/supabase";

// ═══════════════════════════════════════════════════════════════
// FraudShield — Core Fraud Detection Engine for PlacementPlot
// ═══════════════════════════════════════════════════════════════

// ─── Types ─────────────────────────────────────────────────────

export type FraudEventType =
  | "rate_limit"
  | "payment_fraud"
  | "ai_abuse"
  | "auth_abuse"
  | "replay_attack"
  | "prompt_injection"
  | "amount_tamper"
  | "duplicate_order"
  | "suspicious_pattern";

export type FraudSeverity = "low" | "medium" | "high" | "critical";
export type FraudAction = "blocked" | "warned" | "logged" | "rate_limited";

export interface FraudEvent {
  eventType: FraudEventType;
  severity: FraudSeverity;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  route?: string;
  details?: Record<string, unknown>;
  actionTaken: FraudAction;
  riskScore?: number;
}

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Optional human-readable label for logging */
  label?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  totalHits: number;
}

export interface FraudCheckResult {
  allowed: boolean;
  reason?: string;
  riskScore: number;
  signals: RiskSignal[];
}

export interface RiskSignal {
  signal: string;
  weight: number; // 0-100 contribution to risk score
  details?: string;
}

export interface PaymentFraudContext {
  ipAddress: string;
  userId?: string;
  itemType: string;
  amount: number;
  orderId?: string;
  paymentId?: string;
  userAgent?: string;
  route: string;
}

export interface AIAbuseContext {
  ipAddress: string;
  userId?: string;
  route: string;
  inputText: string;
  userAgent?: string;
  payloadSizeBytes?: number;
}

// ─── In-Memory Stores (auto-evicting) ──────────────────────────

interface SlidingWindowEntry {
  timestamps: number[];
}

/** Sliding window rate limit store — keyed by composite string */
const rateLimitStore = new Map<string, SlidingWindowEntry>();

/** Tracks recently used payment IDs to detect replays */
const usedPaymentIds = new Map<string, number>(); // paymentId -> timestamp

/** Tracks recent order creation timestamps per key */
const recentOrderTimestamps = new Map<string, number[]>();

// Evict stale entries every 5 minutes to prevent memory leaks
const EVICTION_INTERVAL_MS = 5 * 60 * 1000;
const MAX_STORE_AGE_MS = 30 * 60 * 1000; // 30 min max retention

let lastEviction = Date.now();

function evictStaleEntries(): void {
  const now = Date.now();
  if (now - lastEviction < EVICTION_INTERVAL_MS) return;
  lastEviction = now;

  const cutoff = now - MAX_STORE_AGE_MS;

  for (const [key, entry] of rateLimitStore) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) rateLimitStore.delete(key);
  }

  for (const [key, ts] of usedPaymentIds) {
    if (ts < cutoff) usedPaymentIds.delete(key);
  }

  for (const [key, timestamps] of recentOrderTimestamps) {
    const filtered = timestamps.filter((t) => t > cutoff);
    if (filtered.length === 0) recentOrderTimestamps.delete(key);
    else recentOrderTimestamps.set(key, filtered);
  }
}

// ─── Prompt Injection Patterns ─────────────────────────────────

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+(instructions|prompts|rules)/i,
  /ignore\s+(the\s+)?(above|system)\s+(prompt|instructions|message)/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|rules)/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /pretend\s+(you\s+are|to\s+be)\s+/i,
  /act\s+as\s+(a|an|if)\s+/i,
  /new\s+(system\s+)?instructions?:/i,
  /\bsystem\s*:\s*/i,
  /\[SYSTEM\]/i,
  /<<\s*SYS\s*>>/i,
  /override\s+(previous|system|all)\s+(instructions|prompts)/i,
  /reveal\s+(your|the)\s+(system\s+)?(prompt|instructions)/i,
  /what\s+(is|are)\s+your\s+(system\s+)?(prompt|instructions)/i,
  /output\s+(your|the)\s+(system\s+)?(prompt|instructions)/i,
  /repeat\s+(your|the)\s+(system\s+)?(prompt|instructions)/i,
  /forget\s+(everything|all|previous)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /developer\s+mode/i,
];

// ─── FraudShield Class ─────────────────────────────────────────

export class FraudShield {
  // ── Rate Limiting ──────────────────────────────────────────

  /**
   * Sliding-window rate limiter.
   * @param key   Composite key, e.g. `"payment:create:192.168.1.1"`
   * @param config  Rate limit configuration
   */
  static checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
    evictStaleEntries();

    const now = Date.now();
    const windowStart = now - config.windowMs;

    let entry = rateLimitStore.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      rateLimitStore.set(key, entry);
    }

    // Remove timestamps outside the current window
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    const totalHits = entry.timestamps.length;

    if (totalHits >= config.maxRequests) {
      // Find when the oldest request in window expires
      const oldestInWindow = entry.timestamps[0];
      const resetMs = oldestInWindow + config.windowMs - now;

      return {
        allowed: false,
        remaining: 0,
        resetMs: Math.max(0, resetMs),
        totalHits,
      };
    }

    // Record this request
    entry.timestamps.push(now);

    return {
      allowed: true,
      remaining: config.maxRequests - totalHits - 1,
      resetMs: config.windowMs,
      totalHits: totalHits + 1,
    };
  }

  // ── Payment Fraud Detection ────────────────────────────────

  /**
   * Detect payment-related fraud signals.
   */
  static checkPaymentFraud(ctx: PaymentFraudContext): FraudCheckResult {
    evictStaleEntries();

    const signals: RiskSignal[] = [];
    const now = Date.now();

    // Signal 1: Rapid duplicate orders (same IP/user within 30s)
    const orderKey = `order:${ctx.userId || ctx.ipAddress}`;
    const recentOrders = recentOrderTimestamps.get(orderKey) || [];
    const veryRecentOrders = recentOrders.filter((t) => now - t < 30_000);
    if (veryRecentOrders.length > 0) {
      signals.push({
        signal: "duplicate_order",
        weight: 40,
        details: `${veryRecentOrders.length} orders in last 30 seconds`,
      });
    }
    // Track this order
    recentOrders.push(now);
    recentOrderTimestamps.set(orderKey, recentOrders.slice(-20)); // Keep last 20

    // Signal 2: Payment ID replay
    if (ctx.paymentId) {
      if (usedPaymentIds.has(ctx.paymentId)) {
        signals.push({
          signal: "payment_replay",
          weight: 90,
          details: `Payment ID ${ctx.paymentId} already used`,
        });
      }
    }

    // Signal 3: Invalid amount (must match known plan amounts)
    const validAmounts = [14900, 9900]; // Premium subscription, interview pack
    if (ctx.amount && !validAmounts.includes(ctx.amount)) {
      signals.push({
        signal: "amount_tamper",
        weight: 70,
        details: `Amount ${ctx.amount} does not match any known plan`,
      });
    }

    // Signal 4: Invalid item type
    const validItemTypes = ["subscription", "pack"];
    if (!validItemTypes.includes(ctx.itemType)) {
      signals.push({
        signal: "invalid_item_type",
        weight: 60,
        details: `Unknown item type: ${ctx.itemType}`,
      });
    }

    // Signal 5: Missing user agent (likely bot)
    if (!ctx.userAgent || ctx.userAgent.length < 10) {
      signals.push({
        signal: "missing_user_agent",
        weight: 20,
        details: "Request has no or very short User-Agent header",
      });
    }

    const riskScore = this.computeRiskScore(signals);
    const allowed = riskScore < 70; // Block if risk >= 70

    return { allowed, riskScore, signals, reason: allowed ? undefined : this.buildReason(signals) };
  }

  /**
   * Mark a payment ID as used (call after successful verification).
   */
  static markPaymentIdUsed(paymentId: string): void {
    usedPaymentIds.set(paymentId, Date.now());
  }

  /**
   * Check if a payment ID has already been used (replay detection).
   */
  static isPaymentIdUsed(paymentId: string): boolean {
    return usedPaymentIds.has(paymentId);
  }

  // ── AI Abuse Detection ─────────────────────────────────────

  /**
   * Detect AI API abuse: prompt injection, oversized payloads, etc.
   */
  static checkAIAbuse(ctx: AIAbuseContext): FraudCheckResult {
    const signals: RiskSignal[] = [];

    // Signal 1: Prompt injection patterns
    const injectionMatches = PROMPT_INJECTION_PATTERNS.filter((p) =>
      p.test(ctx.inputText)
    );
    if (injectionMatches.length > 0) {
      signals.push({
        signal: "prompt_injection",
        weight: Math.min(80, 30 + injectionMatches.length * 15),
        details: `${injectionMatches.length} injection pattern(s) detected`,
      });
    }

    // Signal 2: Abnormally large payload
    const payloadSize = ctx.payloadSizeBytes || new Blob([ctx.inputText]).size;
    if (payloadSize > 50_000) {
      // > 50KB is suspicious for a single request
      signals.push({
        signal: "oversized_payload",
        weight: 50,
        details: `Payload size: ${(payloadSize / 1024).toFixed(1)}KB`,
      });
    }

    // Signal 3: Extremely long input text
    if (ctx.inputText.length > 20_000) {
      signals.push({
        signal: "excessive_input_length",
        weight: 40,
        details: `Input length: ${ctx.inputText.length} chars`,
      });
    }

    // Signal 4: Repetitive content (scraping/spam pattern)
    const words = ctx.inputText.split(/\s+/);
    if (words.length > 20) {
      const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
      const uniqueRatio = uniqueWords.size / words.length;
      if (uniqueRatio < 0.15) {
        signals.push({
          signal: "repetitive_content",
          weight: 45,
          details: `Unique word ratio: ${(uniqueRatio * 100).toFixed(1)}%`,
        });
      }
    }

    // Signal 5: Missing user agent (likely bot)
    if (!ctx.userAgent || ctx.userAgent.length < 10) {
      signals.push({
        signal: "missing_user_agent",
        weight: 15,
        details: "No or very short User-Agent",
      });
    }

    const riskScore = this.computeRiskScore(signals);
    const allowed = riskScore < 70;

    return { allowed, riskScore, signals, reason: allowed ? undefined : this.buildReason(signals) };
  }

  // ── Risk Score Computation ─────────────────────────────────

  /**
   * Compute a composite risk score from individual signals.
   * Uses a weighted-max approach: highest signal dominates,
   * with diminishing contributions from other signals.
   */
  static computeRiskScore(signals: RiskSignal[]): number {
    if (signals.length === 0) return 0;

    // Sort by weight descending
    const sorted = [...signals].sort((a, b) => b.weight - a.weight);

    let score = sorted[0].weight;
    for (let i = 1; i < sorted.length; i++) {
      // Each additional signal adds a fraction of its weight
      score += sorted[i].weight * (0.3 / i);
    }

    return Math.min(100, Math.round(score));
  }

  // ── Fraud Event Logging ────────────────────────────────────

  /**
   * Log a fraud event to the Supabase `fraud_events` table.
   * Fire-and-forget — does not throw on failure.
   */
  static async logFraudEvent(event: FraudEvent): Promise<void> {
    try {
      const supabase = createServerSupabase();
      await supabase.from("fraud_events").insert({
        event_type: event.eventType,
        severity: event.severity,
        user_id: event.userId || null,
        ip_address: event.ipAddress || null,
        user_agent: event.userAgent || null,
        route: event.route || null,
        details: event.details || {},
        action_taken: event.actionTaken,
        risk_score: event.riskScore || null,
      });
    } catch (err) {
      // Log to console but never let fraud logging crash the app
      console.error("[FraudShield] Failed to log fraud event:", err);
    }
  }

  // ── Helpers ────────────────────────────────────────────────

  private static buildReason(signals: RiskSignal[]): string {
    return signals
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((s) => s.signal)
      .join(", ");
  }
}

// ─── Helper: Extract IP from NextRequest ───────────────────────

export function getClientIP(request: Request): string {
  const headers = request.headers;
  // Check common proxy headers
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;

  // Vercel-specific
  const vercelIp = headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();

  return "unknown";
}

// ─── Helper: Build 429 Response ────────────────────────────────

export function rateLimitResponse(
  result: RateLimitResult,
  label?: string
): Response {
  const retryAfterSeconds = Math.ceil(result.resetMs / 1000);
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please slow down and try again.",
      retryAfter: retryAfterSeconds,
      ...(label ? { limit: label } : {}),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(retryAfterSeconds),
      },
    }
  );
}

// ─── Helper: Build fraud-blocked response ──────────────────────

export function fraudBlockedResponse(
  result: FraudCheckResult,
  statusCode: number = 403
): Response {
  return new Response(
    JSON.stringify({
      error: "Request blocked due to suspicious activity.",
      code: "FRAUD_DETECTED",
    }),
    {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// ─── Pre-built Rate Limit Configs ──────────────────────────────

export const RATE_LIMITS = {
  /** Global: 100 requests per minute per IP */
  global: { maxRequests: 100, windowMs: 60_000, label: "global" } as RateLimitConfig,

  /** API routes: 30 requests per minute per IP */
  api: { maxRequests: 30, windowMs: 60_000, label: "api" } as RateLimitConfig,

  /** Payment order creation: 5 per minute per IP */
  paymentCreate: { maxRequests: 5, windowMs: 60_000, label: "payment:create" } as RateLimitConfig,

  /** Payment verification: 10 per minute per user */
  paymentVerify: { maxRequests: 10, windowMs: 60_000, label: "payment:verify" } as RateLimitConfig,

  /** Interview start: 3 per 10 minutes per user */
  interviewStart: { maxRequests: 3, windowMs: 600_000, label: "interview:start" } as RateLimitConfig,

  /** Interview messages: 20 per 10 minutes per user */
  interviewMessage: { maxRequests: 20, windowMs: 600_000, label: "interview:message" } as RateLimitConfig,

  /** Resume analysis: 5 per 10 minutes per user */
  resumeAnalyze: { maxRequests: 5, windowMs: 600_000, label: "resume:analyze" } as RateLimitConfig,

  /** Resume enhancement: 10 per 10 minutes per user */
  resumeEnhance: { maxRequests: 10, windowMs: 600_000, label: "resume:enhance" } as RateLimitConfig,

  /** Roadmap generation: 3 per 30 minutes per user */
  roadmapGenerate: { maxRequests: 3, windowMs: 1_800_000, label: "roadmap:generate" } as RateLimitConfig,

  /** Admin endpoints: 10 per minute */
  admin: { maxRequests: 10, windowMs: 60_000, label: "admin" } as RateLimitConfig,
} as const;
