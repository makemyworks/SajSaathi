"use client";
/** Razorpay Standard Checkout. The amount comes from our server-created order; success is only shown after the webhook confirms capture. */
type RzpResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
declare global { interface Window { Razorpay?: new (o: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void } } }

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the payment window. Check your connection."));
    document.body.appendChild(s);
  });
}

export async function payForBooking(bookingId: string, prefill: { name?: string; phone?: string; description: string }): Promise<"verifying" | "dismissed" | "failed"> {
  const r = await fetch("/api/v1/payments/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message ?? "Payment could not start");
  await loadScript();
  return new Promise((resolve) => {
    const rzp = new window.Razorpay!({
      key: j.order.keyId,
      order_id: j.order.orderId,
      amount: j.order.amountPaise,
      currency: j.order.currency,
      name: "Saj Saathi",
      description: prefill.description.slice(0, 250),
      image: "/icons/icon-192.png",
      prefill: { name: prefill.name, contact: prefill.phone },
      notes: { booking: j.order.bookingRef },
      theme: { color: "#183F3A" },
      handler: async (resp: RzpResponse) => {
        await fetch("/api/v1/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature }) });
        resolve("verifying");
      },
      modal: { ondismiss: () => resolve("dismissed"), confirm_close: true },
    });
    rzp.on("payment.failed", () => resolve("failed"));
    rzp.open();
  });
}
