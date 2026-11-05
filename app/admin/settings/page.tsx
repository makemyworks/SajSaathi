"use client";
import { useEffect, useState } from "react";
import { api, useData } from "@/lib/client";
import { Notice, Spinner } from "@/lib/shared/ui";
type S = { bookingFeePaise: number; bookingFeeTaxPercent: number; defaultCommissionPercent: number; supportEmail?: string; supportPhone?: string };
export default function Settings() {
  const { data } = useData<{ settings: S | null }>("admin/settings");
  const [s, setS] = useState<S | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  useEffect(() => { if (data) setS(data.settings ?? { bookingFeePaise: 0, bookingFeeTaxPercent: 18, defaultCommissionPercent: 10 }); }, [data]);
  if (!s) return <Spinner label="Loading…" />;
  return (
    <form className="grid gap-5 max-w-2xl" onSubmit={async (e) => { e.preventDefault(); try { await api("admin/settings", "PATCH", s); setMsg({ tone: "ok", text: "Saved. New prices apply to new bookings within a minute." }); } catch (x) { setMsg({ tone: "bad", text: (x as Error).message }); } }}>
      <h1 className="text-2xl">System settings</h1>
      <section id="pricing" className="panel p-5 grid gap-3">
        <h2 className="text-lg">Pricing rules (platform defaults)</h2>
        <p className="muted text-[0.95rem]">Order of precedence: partner exception → category pricing → these defaults. Existing bookings keep the price they were booked at.</p>
        <label className="field"><span>Customer booking fee (₹, 0 = none)</span><input className="input" type="number" step="0.01" min="0" value={s.bookingFeePaise / 100} onChange={(e) => setS({ ...s, bookingFeePaise: Math.round(Number(e.target.value) * 100) })} /></label>
        <label className="field"><span>GST on booking fee (%)</span><input className="input" type="number" min="0" max="40" value={s.bookingFeeTaxPercent} onChange={(e) => setS({ ...s, bookingFeeTaxPercent: Number(e.target.value) })} /><small>Confirm the correct rate and your GST registration with your CA.</small></label>
        <label className="field"><span>Default partner commission (%)</span><input className="input" type="number" min="0" max="60" value={s.defaultCommissionPercent} onChange={(e) => setS({ ...s, defaultCommissionPercent: Number(e.target.value) })} /></label>
      </section>
      <section className="panel p-5 grid gap-3">
        <h2 className="text-lg">Support contact</h2>
        <label className="field"><span>Support email</span><input className="input" type="email" value={s.supportEmail ?? ""} onChange={(e) => setS({ ...s, supportEmail: e.target.value })} /></label>
        <label className="field"><span>Support phone</span><input className="input" value={s.supportPhone ?? ""} onChange={(e) => setS({ ...s, supportPhone: e.target.value })} /></label>
      </section>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <button className="btn btn-primary justify-self-start">Save settings</button>
    </form>
  );
}
