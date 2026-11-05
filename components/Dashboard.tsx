"use client";
import Link from "next/link";
import { useData } from "@/lib/client";
import { inr } from "@/lib/shared/format";
import { Spinner } from "@/lib/shared/ui";

type D = { windowDays: number; counts: Record<string, number>; money: { gmvPaise: number; commissionPaise: number; onlineCollectedPaise: number }; bookingsPerDay: { date: string; count: number }[]; topPartners: { id: string; name: string; completed: number }[] };

/** Every figure is counted live from the database. Empty stays empty — no sample numbers. */
export function Dashboard({ days, onDays }: { days: number; onDays?: (d: number) => void }) {
  const { data } = useData<D>(`admin/dashboard?days=${days}`);
  if (!data) return <Spinner label="Loading…" />;
  const max = Math.max(1, ...data.bookingsPerDay.map((d) => d.count));
  const tiles: [string, string | number, string?][] = [
    ["Active customers", data.counts.customers, "/admin/r/customers"], ["Approved partners", data.counts.partnersApproved, "/admin/r/approvals"], ["Applications waiting", data.counts.applicationsWaiting, "/admin/applications"],
    [`Bookings (${days}d)`, data.counts.bookings, "/admin/r/bookings"], [`Completed (${days}d)`, data.counts.completed], [`Cancelled / no-show (${days}d)`, data.counts.cancelled, "/admin/r/cancellations"],
    ["Open refund requests", data.counts.refundsOpen, "/admin/refunds"], ["Open tickets", data.counts.ticketsOpen, "/admin/r/tickets"], ["Active categories", data.counts.categories, "/admin/categories"],
  ];
  return (
    <div className="grid gap-6">
      {onDays && <div className="flex gap-2">{[7, 30, 90, 365].map((d) => <button key={d} className="chip" aria-pressed={d === days} onClick={() => onDays(d)}>{d === 365 ? "1 year" : `${d} days`}</button>)}</div>}
      <section className="grid sm:grid-cols-3 gap-3">
        <div className="panel p-5 bg-[var(--color-teal-800)] text-white border-0"><p className="text-[var(--color-teal-100)]">Completed booking value ({days}d)</p><p className="text-3xl font-semibold tabular-nums">{inr(data.money.gmvPaise)}</p></div>
        <div className="panel p-5"><p className="muted">Commission earned ({days}d)</p><p className="text-3xl font-semibold tabular-nums">{inr(data.money.commissionPaise)}</p></div>
        <div className="panel p-5"><p className="muted">Collected online, net of refunds ({days}d)</p><p className="text-3xl font-semibold tabular-nums">{inr(data.money.onlineCollectedPaise)}</p></div>
      </section>
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {tiles.map(([l, v, href]) => { const inner = <><p className="text-2xl font-semibold tabular-nums">{v}</p><p className="muted text-[0.95rem]">{l}</p></>; return href ? <Link key={l} href={href} className="panel p-4 hover:border-[var(--color-teal-700)]">{inner}</Link> : <div key={l} className="panel p-4">{inner}</div>; })}
      </section>
      <section className="panel p-5 grid gap-3">
        <h2 className="text-lg">New bookings per day</h2>
        <div className="flex items-end gap-[2px] h-40" role="img" aria-label={`Bookings per day over ${days} days, maximum ${max}`}>
          {data.bookingsPerDay.map((d) => <div key={d.date} title={`${d.date}: ${d.count}`} className="flex-1 bg-[var(--color-teal-700)] rounded-t-sm min-h-[2px]" style={{ height: `${(d.count / max) * 100}%`, opacity: d.count ? 1 : 0.25 }} />)}
        </div>
        <p className="muted text-sm">{data.bookingsPerDay[0]?.date} → {data.bookingsPerDay.at(-1)?.date} · peak {max}/day</p>
      </section>
      <section className="panel p-5 grid gap-2"><h2 className="text-lg">Top partners by completed bookings</h2>
        {data.topPartners.length === 0 ? <p className="muted">No completed bookings in this period.</p> : <ol className="grid gap-1">{data.topPartners.map((p, i) => <li key={p.id} className="flex gap-3"><span className="tabular-nums muted">{i + 1}</span><Link className="flex-1 underline-offset-4 hover:underline" href={`/admin/applications/${p.id}`}>{p.name}</Link><span className="tabular-nums">{p.completed}</span></li>)}</ol>}
      </section>
    </div>
  );
}
