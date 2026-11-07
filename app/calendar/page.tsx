"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useData } from "@/lib/client";
import { dayLabel, timeOnly } from "@/lib/shared/format";
import { LoadFailure, Spinner, StatusBadge } from "@/lib/shared/ui";
import { usePartner } from "@/components/Partner";
import type { BookingRow } from "@/components/BookingCard";

/** Week agenda: one column per day on desktop, a stacked list on phones. */
export default function CalendarPage() {
  const { t, locale } = usePartner();
  const [offset, setOffset] = useState(0);
  const base = new Date(Date.now() + 330 * 60000 + offset * 7 * 86400000);
  const days = Array.from({ length: 7 }, (_, i) => new Date(base.getTime() + i * 86400000).toISOString().slice(0, 10));
  const from = new Date(days[0] + "T00:00:00+05:30").toISOString(), to = new Date(new Date(days[6] + "T00:00:00+05:30").getTime() + 86400000).toISOString();
  const { data, error, reload } = useData<{ bookings: BookingRow[] }>(`partner/bookings?scope=all&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=200`);
  const byDay = (d: string) => (data?.bookings ?? []).filter((b) => new Date(new Date(b.start).getTime() + 330 * 60000).toISOString().slice(0, 10) === d && b.status !== "cancelled").sort((a, b) => a.start.localeCompare(b.start));
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2"><h1 className="text-2xl mr-auto">{t.calendar.title}</h1>
        <button className="btn btn-sm btn-outline" aria-label={t.calendar.prev} onClick={() => setOffset(offset - 1)}><ChevronLeft aria-hidden size={18} /></button>
        <button className="btn btn-sm btn-outline" onClick={() => setOffset(0)}>{t.calendar.week}</button>
        <button className="btn btn-sm btn-outline" aria-label={t.calendar.next} onClick={() => setOffset(offset + 1)}><ChevronRight aria-hidden size={18} /></button>
      </div>
      {!data ? (error ? <LoadFailure message={error} onRetry={reload} /> : <Spinner label={t.common.loading} />) : (
        <div className="grid md:grid-cols-7 gap-2">
          {days.map((d) => { const l = dayLabel(d, locale); const list = byDay(d); return (
            <section key={d} className="panel p-3 grid gap-2 content-start md:min-h-64">
              <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-sans)" }}>{l.day} {l.num} {l.month}</h2>
              {list.length === 0 ? <p className="muted text-sm">{t.calendar.free}</p> : list.map((b) => (
                <Link key={b._id} href={`/bookings/${b._id}`} className="rounded-lg bg-[var(--color-teal-50)] p-2 grid gap-0.5 text-sm hover:bg-[var(--color-teal-100)]">
                  <span className="font-semibold tabular-nums">{timeOnly(b.start, locale)}–{timeOnly(b.end, locale)}</span><span className="truncate">{b.customerName}</span><span className="truncate muted">{b.serviceName}</span><StatusBadge status={b.status} label={t.status[b.status as keyof typeof t.status] ?? b.status} />
                </Link>
              ))}
            </section>
          ); })}
        </div>
      )}
    </div>
  );
}
