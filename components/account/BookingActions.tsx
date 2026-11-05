"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Notice, Spinner } from "@/lib/shared/ui";
import { istDate, dayLabel } from "@/lib/shared/format";
import { useI18n } from "../I18n";

type B = { id: string; status: string; start: string; providerSlug: string; serviceId: string; mode: string; addOnIds: string[] };
async function post(url: string, body: unknown) { const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error?.message ?? "Error"); return j; }

export function BookingActions({ booking: b, canReview, reviewed, freeUntilHours, lateFeePercent }: { booking: B; canReview: boolean; reviewed: boolean; freeUntilHours: number; lateFeePercent: number }) {
  const { t, fmt, locale } = useI18n();
  const router = useRouter();
  const [panel, setPanel] = useState<"" | "cancel" | "move" | "review">("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const active = ["pending", "confirmed", "rescheduled"].includes(b.status);
  const hoursLeft = (new Date(b.start).getTime() - Date.now()) / 3_600_000;
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setErr(""); try { await fn(); setPanel(""); router.refresh(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {active && <button className="btn btn-outline" onClick={() => setPanel("move")}>{t.account.reschedule}</button>}
        {active && <button className="btn btn-danger" onClick={() => setPanel("cancel")}>{t.account.cancel}</button>}
        {canReview && <button className="btn btn-primary" onClick={() => setPanel("review")}>{t.account.rate}</button>}
        {reviewed && <span className="badge badge-ok self-center">{t.account.rated}</span>}
        <Link className="btn btn-outline" href={`/account/support?booking=${b.id}`}>{t.account.getHelp}</Link>
      </div>
      {panel === "cancel" && (
        <form className="panel p-4 grid gap-3" onSubmit={(e) => { e.preventDefault(); const note = String(new FormData(e.currentTarget).get("note") ?? ""); run(() => post(`/api/v1/bookings/${b.id}/action`, { action: "cancel", note: note || undefined })); }}>
          <p className="font-semibold">{t.account.cancelConfirm}</p>
          <p className="text-[0.95rem]">{hoursLeft >= freeUntilHours ? fmt(t.provider.freeUntil, { h: freeUntilHours }) : fmt(t.provider.lateFee, { p: lateFeePercent })}</p>
          <label className="field"><span>{t.account.cancelReason}</span><input name="note" className="input" maxLength={300} /></label>
          <div className="flex gap-2"><button className="btn btn-danger" disabled={busy}>{t.account.cancel}</button><button type="button" className="btn btn-outline" onClick={() => setPanel("")}>{t.nav.close}</button></div>
        </form>
      )}
      {panel === "move" && <Reschedule b={b} busy={busy} onPick={(start) => run(() => post(`/api/v1/bookings/${b.id}/reschedule`, { start }))} locale={locale} />}
      {panel === "review" && <ReviewForm busy={busy} onSubmit={(rating, text) => run(() => post(`/api/v1/reviews`, { bookingId: b.id, rating, text: text || undefined }))} />}
      {err && <Notice tone="bad">{err}</Notice>}
    </div>
  );
}

function Reschedule({ b, busy, onPick, locale }: { b: B; busy: boolean; onPick: (start: string) => void; locale: string }) {
  const { t } = useI18n();
  const dates = Array.from({ length: 14 }, (_, i) => istDate(i));
  const [date, setDate] = useState(dates[0]);
  const [slots, setSlots] = useState<{ time: string; start: string }[] | null>(null);
  useEffect(() => {
    setSlots(null);
    fetch(`/api/v1/providers/${b.providerSlug}/slots?${new URLSearchParams({ serviceId: b.serviceId, date, mode: b.mode, addOns: b.addOnIds.join(",") })}`).then((r) => r.json()).then((j) => setSlots(j.slots ?? [])).catch(() => setSlots([]));
  }, [date, b]);
  return (
    <div className="panel p-4 grid gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1">{dates.map((d) => { const l = dayLabel(d, locale); return <button key={d} type="button" aria-pressed={d === date} className="chip shrink-0" onClick={() => setDate(d)}>{l.day} {l.num}</button>; })}</div>
      {slots === null ? <Spinner label={t.booking.loadingSlots} /> : slots.length === 0 ? <p className="muted">{t.booking.noSlots}</p> : (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">{slots.map((s) => <button key={s.start} disabled={busy} className="btn btn-outline btn-sm tabular-nums" onClick={() => onPick(s.start)}>{s.time}</button>)}</div>
      )}
    </div>
  );
}

function ReviewForm({ busy, onSubmit }: { busy: boolean; onSubmit: (rating: number, text: string) => void }) {
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  return (
    <form className="panel p-4 grid gap-3" onSubmit={(e) => { e.preventDefault(); if (rating) onSubmit(rating, text); }}>
      <fieldset><legend className="font-semibold mb-2">{t.account.rate}</legend>
        <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={`${n}`} aria-pressed={rating >= n} onClick={() => setRating(n)} className="p-1"><Star size={32} className={rating >= n ? "fill-[var(--color-gold)] text-[var(--color-gold)]" : "text-[var(--color-line)]"} /></button>)}</div>
      </fieldset>
      <textarea className="input" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
      <button className="btn btn-primary" disabled={busy || !rating}>{t.account.send}</button>
    </form>
  );
}
