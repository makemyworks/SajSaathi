"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Notice } from "@/lib/shared/ui";
import { useI18n } from "./I18n";
import { payForBooking } from "./razorpay";

/** Shows the real payment state from the server; polls while the gateway webhook is pending. Never claims success on its own. */
export function PaymentStatusWatcher({ bookingId, initial, canPay, description }: { bookingId: string; initial: string; canPay: boolean; description: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (status !== "authorized" && status !== "created") return;
    let n = 0;
    const id = setInterval(async () => {
      n++;
      const r = await fetch(`/api/v1/bookings/${bookingId}`).then((x) => x.json()).catch(() => null);
      if (r?.booking?.paymentStatus) setStatus(r.booking.paymentStatus);
      if (n > 20) clearInterval(id);
    }, 3000);
    return () => clearInterval(id);
  }, [status, bookingId]);
  if (status === "captured") return <Notice tone="ok">{t.booking.paymentDone}</Notice>;
  if (status === "authorized") return <Notice>{t.booking.paymentVerifying}</Notice>;
  return (
    <div className="grid gap-3">
      {status === "failed" && <Notice tone="bad">{t.booking.paymentFailed}</Notice>}
      {status !== "failed" && <Notice tone="warn">{t.pay[status as keyof typeof t.pay] ?? status}</Notice>}
      {canPay && <button className="btn btn-primary" disabled={busy} onClick={async () => { setBusy(true); try { const r = await payForBooking(bookingId, { description }); if (r === "verifying") setStatus("authorized"); if (r === "failed") setStatus("failed"); router.refresh(); } finally { setBusy(false); } }}>{t.booking.payNow}</button>}
    </div>
  );
}
