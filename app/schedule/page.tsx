"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import type { WeeklyHours } from "@/lib/core/types";
import { api, useData } from "@/lib/client";
import { dateOnly, dateTime } from "@/lib/shared/format";
import { LoadFailure, Notice, Spinner } from "@/lib/shared/ui";
import { usePartner } from "@/components/Partner";

const ORDER = ["1", "2", "3", "4", "5", "6", "0"] as const;

export default function SchedulePage() {
  const { t, app, appError, appLoading, reloadApp, locale } = usePartner();
  const p = app?.application;
  const [hours, setHours] = useState<WeeklyHours | null>(null);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const blocks = useData<{ blocks: { _id: string; start: string; end: string; reason?: string }[] }>(p ? "partner/blocks" : null);
  useEffect(() => { if (p) { setHours(p.hours); setHolidays(p.holidays); } }, [p]);
  if (!p || !hours) {
    if (appError) return <LoadFailure message={appError} onRetry={reloadApp} />;
    if (appLoading || (p && !hours)) return <Spinner label={t.common.loading} />;
    return <div className="grid gap-3"><Notice tone="info">Complete your partner application before setting business hours.</Notice><Link className="btn btn-primary justify-self-start" href="/application">Open application</Link></div>;
  }
  const setDay = (d: (typeof ORDER)[number], patch: Partial<{ open: boolean; start: string; end: string }>) => {
    const cur = hours[d]; const slot = cur.slots[0] ?? { start: "10:00", end: "19:00" };
    setHours({ ...hours, [d]: { open: patch.open ?? cur.open, slots: [{ start: patch.start ?? slot.start, end: patch.end ?? slot.end }] } });
  };
  const run = async (fn: () => Promise<unknown>) => { setMsg(null); try { await fn(); setMsg({ tone: "ok", text: t.common.saved }); reloadApp(); } catch (e) { setMsg({ tone: "bad", text: (e as Error).message }); } };
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl">{t.schedule.title}</h1>
      <section className="panel p-4 grid gap-2">
        {ORDER.map((d) => { const day = hours[d]; const s = day.slots[0] ?? { start: "10:00", end: "19:00" }; return (
          <div key={d} className="grid grid-cols-[6.5rem_auto_1fr_1fr] gap-2 items-center">
            <span className="font-medium">{t.schedule.days[Number(d)]}</span>
            <label className="flex items-center gap-2"><input type="checkbox" className="size-6 accent-[var(--color-teal-800)]" checked={day.open} onChange={(e) => setDay(d, { open: e.target.checked })} /><span className="sr-only">{t.schedule.open}</span></label>
            <input type="time" aria-label={t.schedule.from} className="input" disabled={!day.open} value={s.start} onChange={(e) => setDay(d, { start: e.target.value })} />
            <input type="time" aria-label={t.schedule.to} className="input" disabled={!day.open} value={s.end} onChange={(e) => setDay(d, { end: e.target.value })} />
          </div>
        ); })}
        <button className="btn btn-primary justify-self-start mt-2" onClick={() => run(() => api("partner/hours", "PUT", { hours }))}>{t.schedule.save}</button>
      </section>
      <section className="panel p-4 grid gap-3">
        <h2 className="text-lg">{t.schedule.holidays}</h2>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const d = String(new FormData(e.currentTarget).get("d") ?? ""); if (d) { const next = [...holidays, d]; setHolidays(next); run(() => api("partner/holidays", "PUT", { dates: next })); } }}>
          <input type="date" name="d" className="input" aria-label={t.schedule.addHoliday} /><button className="btn btn-outline"><Plus aria-hidden size={16} />{t.schedule.addHoliday}</button>
        </form>
        <ul className="flex flex-wrap gap-2">{holidays.map((d) => <li key={d} className="chip">{dateOnly(d, locale)}<button aria-label={t.schedule.remove} onClick={() => { const next = holidays.filter((x) => x !== d); setHolidays(next); run(() => api("partner/holidays", "PUT", { dates: next })); }}><Trash2 aria-hidden size={14} /></button></li>)}</ul>
      </section>
      <section id="blocks" className="panel p-4 grid gap-3">
        <h2 className="text-lg">{t.schedule.blocks}</h2>
        <form className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const form = e.currentTarget; run(async () => { await api("partner/blocks", "POST", { start: new Date(String(f.get("start")) + "+05:30").toISOString(), end: new Date(String(f.get("end")) + "+05:30").toISOString(), reason: f.get("reason") || undefined }); form.reset(); blocks.reload(); }); }}>
          <label className="field"><span>{t.schedule.start}</span><input type="datetime-local" name="start" className="input" required /></label>
          <label className="field"><span>{t.schedule.end}</span><input type="datetime-local" name="end" className="input" required /></label>
          <label className="field"><span>{t.schedule.reason}</span><input name="reason" className="input" /></label>
          <button className="btn btn-outline">{t.schedule.addBlock}</button>
        </form>
        {blocks.error && <LoadFailure message={blocks.error} onRetry={blocks.reload} />}<ul className="grid gap-2">{blocks.data?.blocks.map((b) => <li key={b._id} className="flex items-center gap-3"><span className="flex-1">{dateTime(b.start, locale)} – {dateTime(b.end, locale)}{b.reason ? ` · ${b.reason}` : ""}</span><button className="btn btn-sm btn-danger" onClick={() => run(async () => { await api(`partner/blocks/${b._id}`, "DELETE"); blocks.reload(); })}>{t.schedule.remove}</button></li>)}</ul>
      </section>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </div>
  );
}
