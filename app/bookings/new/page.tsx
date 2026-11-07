"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Service } from "@/lib/core/types";
import { api, useData } from "@/lib/client";
import { istDate, dayLabel, inr } from "@/lib/shared/format";
import { Empty, LoadFailure, Notice, Spinner } from "@/lib/shared/ui";
import { usePartner } from "@/components/Partner";

export default function WalkIn() {
  const { t, locale, app } = usePartner();
  const isHindi = locale === "hi";
  const router = useRouter();
  const { data, error: servicesError, reload: reloadServices } = useData<{ services: Service[] }>("partner/services");
  const services = useMemo(() => data?.services.filter((s) => s.active) ?? [], [data?.services]);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(istDate(0));
  const [slots, setSlots] = useState<{ time: string; start: string }[] | null>(null);
  const [start, setStart] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!serviceId && services[0]) setServiceId(services[0]._id); }, [services, serviceId]);
  useEffect(() => {
    if (!serviceId || !app?.application) return;
    setSlots(null); setStart("");
    api<{ slots: { time: string; start: string }[] }>(`providers/${app.application.slug}/slots?${new URLSearchParams({ serviceId, date })}`).then((j) => setSlots(j.slots)).catch(() => setSlots([]));
  }, [serviceId, date, app]);
  const now = () => { const d = new Date(Math.ceil(Date.now() / 300000) * 300000); return d.toISOString(); };
  return (
    <form className="grid gap-4" onSubmit={async (e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setErr("");
      try { await api("bookings", "POST", { providerId: app!.application!._id, serviceId, start, addOnIds: [], mode: "in_store", paymentMethod: "pay_at_venue", customerName: f.get("name"), customerPhone: f.get("phone") || undefined }); router.push("/bookings?tab=today"); }
      catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
    }}>
      <h1 className="text-2xl">{t.bookings.walkIn}</h1>
      {!data ? (servicesError ? <LoadFailure message={servicesError} onRetry={reloadServices} /> : <Spinner label={t.common.loading} />) : services.length === 0 ? <Empty title={isHindi ? "अभी कोई सक्रिय सेवा नहीं है" : "No active services yet"} body={isHindi ? "वॉक-इन बुकिंग जोड़ने से पहले कम से कम एक सेवा और कीमत जोड़ें।" : "Add at least one service and price before creating a walk-in booking."} action={<Link href="/services" className="btn btn-outline btn-sm">{t.apply.goServices}</Link>} /> : (
        <label className="field"><span>{t.bookings.service}</span><select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>{services.map((s) => <option key={s._id} value={s._id}>{s.name} · {inr(s.pricePaise, locale)}</option>)}</select></label>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1">{Array.from({ length: 7 }, (_, i) => istDate(i)).map((d) => { const l = dayLabel(d, locale); return <button type="button" key={d} className="chip shrink-0" aria-pressed={d === date} onClick={() => setDate(d)}>{l.day} {l.num}</button>; })}</div>
      <div className="flex flex-wrap gap-2">
        {date === istDate(0) && <button type="button" className="chip" aria-pressed={start !== "" && !slots?.some((s) => s.start === start)} onClick={() => setStart(now())}>Now</button>}
        {slots === null ? <Spinner label={t.common.loading} /> : slots.map((s) => <button type="button" key={s.start} className="chip tabular-nums" aria-pressed={start === s.start} onClick={() => setStart(s.start)}>{s.time}</button>)}
      </div>
      <label className="field"><span>{t.bookings.walkInName}</span><input name="name" className="input" required /></label>
      <label className="field"><span>{t.bookings.walkInPhone}</span><input name="phone" className="input" inputMode="tel" /></label>
      {err && <Notice tone="bad">{err}</Notice>}
      <button className="btn btn-primary btn-xl" disabled={busy || !start || !serviceId}>{t.bookings.save}</button>
    </form>
  );
}
