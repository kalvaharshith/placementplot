import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { createServerSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    const verified = verifyWebhookSignature(rawBody, signature);

    // If signature verification fails AND we are not in development/testing mode, return 400.
    if (!verified && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    const supabase = createServerSupabase();

    // ── Handle Payment Capture event ──
    if (event === "payment.captured" || event === "order.paid") {
      const payment = payload.payload.payment.entity;
      const notes = payment.notes || {};
      const orderId = payment.order_id;
      
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
