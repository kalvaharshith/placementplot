import { NextRequest, NextResponse } from "next/server";
import { getRazorpay, PLANS, INTERVIEW_PACK_PRICE } from "@/lib/razorpay";
import {
  FraudShield,
  getClientIP,
  rateLimitResponse,
  fraudBlockedResponse,
  RATE_LIMITS,
} from "@/lib/fraud-shield";

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || undefined;

  // ── FraudShield: Rate limit (5 orders/min per IP) ──
  const rateCheck = FraudShield.checkRateLimit(
    `payment:create:${ip}`,
    RATE_LIMITS.paymentCreate
  );
  if (!rateCheck.allowed) {
    FraudShield.logFraudEvent({
      eventType: "rate_limit",
      severity: "high",
      ipAddress: ip,
      userAgent,
      route: "/api/payment/create-order",
      details: { hits: rateCheck.totalHits },
      actionTaken: "rate_limited",
      riskScore: 60,
    });
    return rateLimitResponse(rateCheck, "payment:create");
  }

  try {
    const body = await request.json();
    const { itemType, packId } = body;

    let amount = 0;
    let notes: Record<string, string> = {};

    if (itemType === "subscription") {
      amount = PLANS.premium.amount;
      notes = { planName: "Premium Subscription", type: "subscription" };
    } else if (itemType === "pack") {
      amount = INTERVIEW_PACK_PRICE;
      notes = { packId: packId || "general_pack", type: "pack" };
    } else {
      return NextResponse.json({ error: "Invalid payment item type" }, { status: 400 });
    }

    // ── FraudShield: Payment fraud check ──
    const fraudCheck = FraudShield.checkPaymentFraud({
      ipAddress: ip,
      itemType,
      amount,
      userAgent,
      route: "/api/payment/create-order",
    });

    if (!fraudCheck.allowed) {
      FraudShield.logFraudEvent({
        eventType: "payment_fraud",
        severity: "high",
        ipAddress: ip,
        userAgent,
        route: "/api/payment/create-order",
        details: {
          itemType,
          amount,
          signals: fraudCheck.signals,
          reason: fraudCheck.reason,
        },
        actionTaken: "blocked",
        riskScore: fraudCheck.riskScore,
      });
      return fraudBlockedResponse(fraudCheck);
    }

    // Log medium-risk requests for monitoring (but allow them through)
    if (fraudCheck.riskScore >= 30) {
      FraudShield.logFraudEvent({
        eventType: "suspicious_pattern",
        severity: "low",
        ipAddress: ip,
        userAgent,
        route: "/api/payment/create-order",
        details: {
          itemType,
          amount,
          signals: fraudCheck.signals,
        },
        actionTaken: "warned",
        riskScore: fraudCheck.riskScore,
      });
    }

    // Attempt to create a real Razorpay order if API keys are set
    try {
      const razorpay = getRazorpay();
      const order = await razorpay.orders.create({
        amount,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes,
      });

      return NextResponse.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        isMock: false,
      });
    } catch (razorpayError: any) {
      console.warn("Razorpay API creation failed, returning a mock checkout order:", razorpayError.message);
      
      // Fallback: Generate a mock order token for sandboxed front-end testing
      return NextResponse.json({
        success: true,
        orderId: `order_mock_${Math.random().toString(36).substring(2, 12)}`,
        amount,
        currency: "INR",
        key: "rzp_test_mockkeyid12345",
        isMock: true,
      });
    }
  } catch (error: any) {
    console.error("Payment order generation error:", error);
    return NextResponse.json(
      { error: "Payment backend error", details: error.message },
      { status: 500 }
    );
  }
}
