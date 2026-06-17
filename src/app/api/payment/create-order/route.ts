import { NextRequest, NextResponse } from "next/server";
import { getRazorpay, PLANS, INTERVIEW_PACK_PRICE } from "@/lib/razorpay";

export async function POST(request: NextRequest) {
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
