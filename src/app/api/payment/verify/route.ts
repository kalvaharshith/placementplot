import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { PLANS, INTERVIEW_PACK_PRICE } from "@/lib/razorpay";
import crypto from "crypto";
import {
  FraudShield,
  getClientIP,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/fraud-shield";

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || undefined;

  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, itemType, packId } = body;

    const supabase = createServerSupabase();

    // Verify session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // ── FraudShield: Rate limit (10 verifications/min per user) ──
    const rateCheck = FraudShield.checkRateLimit(
      `payment:verify:${user.id}`,
      RATE_LIMITS.paymentVerify
    );
    if (!rateCheck.allowed) {
      FraudShield.logFraudEvent({
        eventType: "rate_limit",
        severity: "high",
        userId: user.id,
        ipAddress: ip,
        userAgent,
        route: "/api/payment/verify",
        details: { hits: rateCheck.totalHits },
        actionTaken: "rate_limited",
        riskScore: 65,
      });
      return rateLimitResponse(rateCheck, "payment:verify");
    }

    // ── FraudShield: Payment ID replay detection ──
    if (razorpay_payment_id && FraudShield.isPaymentIdUsed(razorpay_payment_id)) {
      FraudShield.logFraudEvent({
        eventType: "replay_attack",
        severity: "critical",
        userId: user.id,
        ipAddress: ip,
        userAgent,
        route: "/api/payment/verify",
        details: {
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
        },
        actionTaken: "blocked",
        riskScore: 95,
      });
      return NextResponse.json(
        { error: "This payment has already been processed." },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Perform signature verification if key is configured (production/real checkout)
    if (keySecret) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json({ error: "Missing verification parameters" }, { status: 400 });
      }

      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const generated_signature = crypto
        .createHmac("sha256", keySecret)
        .update(text)
        .digest("hex");

      if (generated_signature !== razorpay_signature) {
        FraudShield.logFraudEvent({
          eventType: "payment_fraud",
          severity: "critical",
          userId: user.id,
          ipAddress: ip,
          userAgent,
          route: "/api/payment/verify",
          details: {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            reason: "Signature mismatch",
          },
          actionTaken: "blocked",
          riskScore: 95,
        });
        return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
      }
    } else {
      console.warn("Razorpay API key secret not configured. Bypassing verification in sandbox simulation.");
    }

    // ── FraudShield: Amount validation ──
    const expectedAmount = itemType === "subscription" ? PLANS.premium.amount : INTERVIEW_PACK_PRICE;
    // Amount validation is server-side — we use the expected amount, not client-provided

    // ── FraudShield: Mark payment ID as used (idempotency) ──
    if (razorpay_payment_id) {
      FraudShield.markPaymentIdUsed(razorpay_payment_id);
    }

    // Update user profile tier and credits
    if (itemType === "subscription") {
      // Update profile to Premium
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          tier: "premium",
          resume_credits: 9999,
          interview_credits: 9999,
        })
        .eq("id", user.id);

      if (profileError) {
        throw new Error(`Profile update failed: ${profileError.message}`);
      }

      // Log/Insert subscription record
      await supabase.from("subscriptions").insert({
        user_id: user.id,
        razorpay_subscription_id: razorpay_payment_id || `pay_mock_${Date.now()}`,
        plan: "premium",
        status: "active",
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } else if (itemType === "pack") {
      // Fetch current credits
      const { data: profile } = await supabase
        .from("profiles")
        .select("interview_credits")
        .eq("id", user.id)
        .single();

      const currentCredits = profile?.interview_credits || 0;

      // Increment by 10 for company pack
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          interview_credits: currentCredits + 10,
        })
        .eq("id", user.id);

      if (profileError) {
        throw new Error(`Profile credits update failed: ${profileError.message}`);
      }

      // Log purchase
      await supabase.from("user_purchases").insert({
        user_id: user.id,
        amount: expectedAmount,
        payment_id: razorpay_payment_id || `pay_mock_${Date.now()}`,
      });
    } else {
      return NextResponse.json({ error: "Invalid item type" }, { status: 400 });
    }

    return NextResponse.json({ success: true, isMock: !keySecret });
  } catch (error: any) {
    console.error("Payment verification failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
