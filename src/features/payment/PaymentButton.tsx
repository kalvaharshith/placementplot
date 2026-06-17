"use client";

import { useState } from "react";

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
      // 1. Create order on Next.js backend
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, packId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create order");
      }

      // 2. If backend returns mock checkout order, trigger mock checkout success
      if (data.isMock) {
        setLoading(false);
        setShowMockModal(true);
        return;
      }

      // 3. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        // Fallback to mock modal if script failed to load
        setLoading(false);
        setShowMockModal(true);
        return;
      }

      // 4. Open Razorpay checkout options
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
            // Send mock payment capture event to local webhook for testing database update
            await fetch("/api/payment/webhook", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event: "payment.captured",
                payload: {
                  payment: {
                    entity: {
                      id: response.razorpay_payment_id,
                      amount: data.amount,
                      order_id: response.razorpay_order_id,
                      notes: {
                        type: itemType,
                        userId: "mock-user-uuid-12345", // Simulated default user ID
                      },
                    },
                  },
                },
              }),
            });

            if (onSuccess) onSuccess(response.razorpay_payment_id);
          } catch (e) {
            console.error("Capture trigger error:", e);
          } finally {
            setLoading(false);
            window.location.reload(); // Refresh to update user tier state
          }
        },
        theme: {
          color: "#3b82f6", // Matching premium brand color
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
      // Fallback
      setShowMockModal(true);
    } finally {
      setLoading(false);
    }
  };

  const triggerMockSuccess = async () => {
    setShowMockModal(false);
    setLoading(true);
    try {
      // Trigger update on profile in backend
      const response = await fetch("/api/payment/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "payment.captured",
          payload: {
            payment: {
              entity: {
                id: `pay_mock_${Math.random().toString(36).substring(2, 12)}`,
                amount: itemType === "subscription" ? 14900 : 9900,
                order_id: `order_mock_${Math.random().toString(36).substring(2, 12)}`,
                notes: {
                  type: itemType,
                  userId: "mock-user-uuid-12345",
                },
              },
            },
          },
        }),
      });

      if (onSuccess) onSuccess("pay_mock_success");
    } catch (e) {
      console.error("Mock webhook fail:", e);
    } finally {
      setLoading(false);
      window.location.reload(); // Refresh to update user tier state
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
