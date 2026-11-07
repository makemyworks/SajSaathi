"use client";
import { Fragment, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, useData } from "@/lib/client";
import type { Booking, Category } from "@/lib/core/types";
import { dateTime, inr, istDate, dayLabel } from "@/lib/shared/format";
import { LoadFailure, Notice, Spinner, StatusBadge } from "@/lib/shared/ui";
import { usePartner } from "@/components/Partner";
import { BookingCard } from "@/components/BookingCard";

type Detail = { booking: Booking; category: Pick<Category, "bookingFields" | "name"> | null };

export default function BookingDetail() {
  const { id } = useParams() as { id: string };
  const { t, locale, pick, app } = usePartner();
  const { data, error, reload } = useData<Detail>(`bookings/${id}`);
  const [move, setMove] = useState(false);
  if (!data) return error ? <LoadFailure message={error} onRetry={reload} /> : <Spinner label={t.common.loading} />;
  const b = data.booking;
  const fields = data.category?.bookingFields ?? [];
  return (
    <div className="grid gap-4">
      <Link href="/bookings" className="underline muted">← {t.bookings.title}</Link>
      <ul><BookingCard b={{ ...b, start: String(b.start), end: String(b.end), arrivedAt: b.arrivedAt ? String(b.arrivedAt) : undefined, area: b.address ? `${b.address.locality ?? ""} ${b.address.pin}` : undefined }} onChange={reload} showDate /></ul>
      <dl className="panel p-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className="muted">Ref</dt><dd className="tabular-nums">{b.ref}</dd>
        <dt className="muted">{t.bookings.when}</dt><dd>{dateTime(b.start, locale)}</dd>
        {b.address && <><dt className="muted">{t.bookings.where}</dt><dd>{[b.address.line1, b.address.line2, b.address.locality, b.address.landmark, b.address.city, b.address.pin].filter(Boolean).join(", ")}</dd></>}
        {fields.map((f) => b.fields[f.key] !== undefined && b.fields[f.key] !== "" ? <Fragment key={f.key}><dt className="muted">{pick(f.label)}</dt><dd>{Array.isArray(b.fields[f.key]) ? (b.fields[f.key] as string[]).join(", ") : typeof b.fields[f.key] === "boolean" ? (b.fields[f.key] ? t.common.yes : t.common.no) : f.options?.find((o) => o.value === b.fields[f.key]) ? pick(f.options.find((o) => o.value === b.fields[f.key])!.label) : String(b.fields[f.key])}</dd></Fragment> : null)}
        <dt className="muted">{t.bookings.total}</dt><dd className="tabular-nums">{inr(b.price.totalPaise, locale)} · {b.paymentStatus === "captured" ? t.bookings.paid : t.bookings.payAtVenue}</dd>
      </dl>
      {["pending", "confirmed", "rescheduled"].includes(b.status) && app?.application && (
        <div className="grid gap-2"><button className="btn btn-outline justify-self-start" onClick={() => setMove(!move)}>{t.bookings.reschedule}</button>{move && <Reschedule id={b._id} slug={app.application.slug} serviceId={b.serviceId} mode={b.mode} addOns={b.addOnIds} onDone={() => { setMove(false); reload(); }} />}</div>
      )}
      <section className="grid gap-2"><h2 className="text-lg">History</h2><ol className="grid gap-1 border-l-2 border-[var(--color-line)] pl-4">{b.history.map((h, i) => <li key={i}><StatusBadge status={h.to} label={t.status[h.to as keyof typeof t.status] ?? h.to} /> <span className="muted text-sm">{dateTime(h.at, locale)}</span>{h.note && <span className="block text-[0.95rem]">{h.note}</span>}</li>)}</ol></section>
    </div>
  );
}

function Reschedule({ id, slug, serviceId, mode, addOns, onDone }: { id: string; slug: string; serviceId: string; mode: string; addOns: string[]; onDone: () => void }) {
  const { t, locale } = usePartner();
  const dates = Array.from({ length: 14 }, (_, i) => istDate(i));
  const [date, setDate] = useState(dates[0]);
  const [slots, setSlots] = useState<{ time: string; start: string }[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { setSlots(null); api<{ slots: { time: string; start: string }[] }>(`providers/${slug}/slots?${new URLSearchParams({ serviceId, date, mode, addOns: addOns.join(",") })}`).then((j) => setSlots(j.slots)).catch(() => setSlots([])); }, [date, slug, serviceId, mode, addOns]);
  return (
    <div className="panel p-4 grid gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1">{dates.map((d) => { const l = dayLabel(d, locale); return <button key={d} className="chip shrink-0" aria-pressed={d === date} onClick={() => setDate(d)}>{l.day} {l.num}</button>; })}</div>
      {slots === null ? <Spinner label={t.common.loading} /> : <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">{slots.map((s) => <button key={s.start} className="btn btn-outline btn-sm tabular-nums" onClick={async () => { try { await api(`bookings/${id}/reschedule`, "POST", { start: s.start }); onDone(); } catch (e) { setErr((e as Error).message); } }}>{s.time}</button>)}</div>}
      {err && <Notice tone="bad">{err}</Notice>}
    </div>
  );
}
