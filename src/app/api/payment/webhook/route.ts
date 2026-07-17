import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, PLANS, INTERVIEW_PACK_PRICE } from "@/lib/razorpay";
import { createServerSupabase } from "@/lib/supabase";
import {
  FraudShield,
  getClientIP,
} from "@/lib/fraud-shield";

// Track processed webhook payment IDs to prevent replay
const processedWebhookPaymentIds = new Set<string>();

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    const verified = verifyWebhookSignature(rawBody, signature);

    // ── FraudShield: Strict signature verification ──
    // In production, always require valid signature. In dev, warn but allow.
    if (!verified) {
      if (process.env.NODE_ENV === "production") {
        FraudShield.logFraudEvent({
          eventType: "payment_fraud",
          severity: "critical",
          ipAddress: ip,
          route: "/api/payment/webhook",
          details: { reason: "Invalid webhook signature" },
          actionTaken: "blocked",
          riskScore: 95,
        });
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      } else {
        console.warn("[FraudShield] Webhook signature verification failed in dev mode — allowing for testing.");
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    const supabase = createServerSupabase();

    // ── Handle Payment Capture event ──
    if (event === "payment.captured" || event === "order.paid") {
      const payment = payload.payload.payment.entity;
      const notes = payment.notes || {};
      const orderId = payment.order_id;
      const paymentId = payment.id;

      // ── FraudShield: Webhook replay/idempotency check ──
      if (paymentId && processedWebhookPaymentIds.has(paymentId)) {
        FraudShield.logFraudEvent({
          eventType: "replay_attack",
          severity: "high",
          ipAddress: ip,
          route: "/api/payment/webhook",
          details: { paymentId, orderId, reason: "Duplicate webhook delivery" },
          actionTaken: "blocked",
          riskScore: 80,
        });
        // Return 200 to prevent Razorpay from retrying (idempotent response)
        return NextResponse.json({ success: true, duplicate: true });
      }

      // ── FraudShield: Amount validation ──
      const paymentAmount = payment.amount;
      const validAmounts = [PLANS.premium.amount, INTERVIEW_PACK_PRICE];
      if (!validAmounts.includes(paymentAmount)) {
        FraudShield.logFraudEvent({
          eventType: "amount_tamper",
          severity: "critical",
          ipAddress: ip,
          route: "/api/payment/webhook",
          details: {
            paymentId,
            orderId,
            receivedAmount: paymentAmount,
            validAmounts,
          },
          actionTaken: "blocked",
          riskScore: 90,
        });
        return NextResponse.json(
          { error: "Payment amount does not match any known plan" },
          { status: 400 }
        );
      }

      // Mark as processed
      if (paymentId) {
        processedWebhookPaymentIds.add(paymentId);
        FraudShield.markPaymentIdUsed(paymentId);
        // Evict old entries to prevent unbounded growth (keep last 1000)
        if (processedWebhookPaymentIds.size > 1000) {
          const firstKey = processedWebhookPaymentIds.values().next().value;
          if (firstKey) processedWebhookPaymentIds.delete(firstKey);
        }
      }
      
      // Determine user ID (should be passed in notes or retrieved from transaction history)
      const userId = notes.userId || notes.user_id;

      if (userId) {
        if (notes.type === "subscription") {
          // Update profile to Premium
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ tier: "premium", resume_credits: 9999, interview_credits: 9999 })
            .eq("id", userId);

          if (profileError) {
            console.error("Failed to update profile to premium tier in webhook:", profileError.message);
          }

          // Log/Insert subscription record
          await supabase.from("subscriptions").insert({
            user_id: userId,
            razorpay_subscription_id: payment.id,
            plan: "premium",
            status: "active",
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
        } else if (notes.type === "pack") {
          // Increment user's interview credits or insert package purchase
          // For interview pack, add 10 interview credits
          const { data: profile } = await supabase
            .from("profiles")
            .select("interview_credits")
            .eq("id", userId)
            .single();

          const currentCredits = profile?.interview_credits || 0;
          await supabase
            .from("profiles")
            .update({ interview_credits: currentCredits + 10 })
            .eq("id", userId);

          // Log purchase
          await supabase.from("user_purchases").insert({
            user_id: userId,
            amount: payment.amount,
            payment_id: payment.id,
          });
        }
      }
    }

    return NextResponse.json({ success: true, verified: verified || "bypassed_in_dev" });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
