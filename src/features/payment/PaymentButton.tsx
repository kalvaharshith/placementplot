"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface PaymentButtonProps {
  itemType: "subscription" | "pack";
  packId?: string;
  className?: string;
  children: React.ReactNode;
  onSuccess?: (paymentId: string) => void;
}

export default function PaymentButton({
  itemType,
  packId,
  className = "",
  children,
  onSuccess,
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showMockModal, setShowMockModal] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      // 1. Get logged-in user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be logged in to purchase or upgrade.");
        return;
      }

      // 2. Create order on Next.js backend
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, packId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create order");
      }

      // 3. If backend returns mock checkout order, trigger sandbox testing modal
      if (data.isMock) {
        setLoading(false);
        setShowMockModal(true);
        return;
      }

      // 4. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setLoading(false);
        setShowMockModal(true); // Fallback to sandbox if loading failed
        return;
      }

      // 5. Open real Razorpay checkout popup
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: "PlacementPlot AI",
        description: itemType === "subscription" ? "Premium Access Upgrade" : "Purchase Interview Pack",
        order_id: data.orderId,
        handler: async function (response: any) {
          setLoading(true);
          try {
            // Trigger server verification
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                itemType,
                packId,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Payment verification failed");
            }

            if (onSuccess) onSuccess(response.razorpay_payment_id);
          } catch (e: any) {
            console.error("Capture trigger error:", e);
            alert(`Payment verification failed: ${e.message}`);
          } finally {
            setLoading(false);
            window.location.reload(); // Refresh to update user tier state
          }
        },
        theme: {
          color: "#3b82f6",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Payment flow error:", err);
      setShowMockModal(true); // Fallback to sandbox on unexpected errors
    } finally {
      setLoading(false);
    }
  };

  const triggerMockSuccess = async () => {
    setShowMockModal(false);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Must be logged in to proceed.");

      const mockOrderId = `order_mock_${Math.random().toString(36).substring(2, 12)}`;
      const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 12)}`;

      // Trigger verification backend in sandbox mock mode
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: mockOrderId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: "mock_signature_bypass",
          itemType,
          packId,
        }),
      });

      const verifyData = await res.json();
      if (!res.ok || !verifyData.success) {
        throw new Error(verifyData.error || "Mock verification failed");
      }

      if (onSuccess) onSuccess(mockPaymentId);
    } catch (e: any) {
      console.error("Mock verification failed:", e);
      alert(`Simulation failed: ${e.message}`);
    } finally {
      setLoading(false);
      window.location.reload(); // Refresh to update UI states
    }
  };

  return (
    <>
      <button
        onClick={handlePayment}
        disabled={loading}
        className={`${className} flex items-center justify-center gap-2`}
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
              <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Processing...
          </>
        ) : (
          children
        )}
      </button>

      {/* Mock payment modal overlay */}
      {showMockModal && (
        <div className="fixed inset-0 bg-surface-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card rounded-2xl p-6 max-w-sm w-full border border-white/10 shadow-2xl relative animate-scale-in text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-primary-500/10 flex items-center justify-center mx-auto text-primary-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-white">Razorpay Sandbox Testing</h3>
              <p className="text-xs text-gray-400 mt-1">
                No active Razorpay API Keys detected. We will simulate a successful purchase flow for previewing the app's premium features.
              </p>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-left space-y-1.5 text-xs text-gray-300 font-mono">
              <div className="flex justify-between">
                <span>Item:</span>
                <span className="text-white capitalize">{itemType}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="text-white">{itemType === "subscription" ? "₹149" : "₹99"}</span>
              </div>
              <div className="flex justify-between">
                <span>Network:</span>
                <span className="text-warning-400">Sandbox Simulator</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowMockModal(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-white/5 text-gray-400 hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={triggerMockSuccess}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold gradient-bg text-white hover:opacity-95 transition-all shadow-lg shadow-primary-500/20"
              >
                Complete Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
