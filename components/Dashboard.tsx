"use client";
import Link from "next/link";
import { Activity, ArrowRight, ArrowUpRight, CalendarDays, ClipboardCheck, CreditCard, LifeBuoy, Store, Users } from "lucide-react";
import { useData } from "@/lib/client";
import { inr } from "@/lib/shared/format";
import { Notice, Spinner } from "@/lib/shared/ui";

type D = { windowDays: number; counts: Record<string, number>; money: { gmvPaise: number; commissionPaise: number; onlineCollectedPaise: number }; bookingsPerDay: { date: string; count: number }[]; topPartners: { id: string; name: string; completed: number }[] };

/** Live operational summary; all displayed values come from the admin API. */
export function Dashboard({ days, onDays }: { days: number; onDays?: (d: number) => void }) {
  const { data, error, loading, reload } = useData<D>(`admin/dashboard?days=${days}`);
  if (!data) return <div className="grid gap-3">{error ? <Notice tone="bad"><div className="grid gap-2"><strong>Dashboard data could not be loaded.</strong><span>{error}</span><button className="btn btn-sm btn-outline justify-self-start" onClick={() => reload()}>Retry dashboard</button></div></Notice> : <Spinner label={loading ? "Loading live business data…" : "Loading…"} />}</div>;
  const max = Math.max(1, ...data.bookingsPerDay.map((d) => d.count));
  const tiles: { label: string; value: number; href?: string; hint: string }[] = [
    { label: "Active customers", value: data.counts.customers ?? 0, href: "/admin/r/customers", hint: "Customer accounts" },
    { label: "Approved partners", value: data.counts.partnersApproved ?? 0, href: "/admin/r/approvals", hint: "Visible after approval" },
    { label: "Applications waiting", value: data.counts.applicationsWaiting ?? 0, href: "/admin/applications", hint: "Review queue" },
    { label: `Bookings · ${days} days`, value: data.counts.bookings ?? 0, href: "/admin/r/bookings", hint: "All booking statuses" },
    { label: `Completed · ${days} days`, value: data.counts.completed ?? 0, hint: "Completed bookings" },
    { label: `Cancelled / no-show · ${days} days`, value: data.counts.cancelled ?? 0, href: "/admin/r/cancellations", hint: "Operational exceptions" },
    { label: "Open refund requests", value: data.counts.refundsOpen ?? 0, href: "/admin/refunds", hint: "Requires review" },
    { label: "Open support tickets", value: data.counts.ticketsOpen ?? 0, href: "/admin/r/tickets", hint: "Customer and partner support" },
    { label: "Active categories", value: data.counts.categories ?? 0, href: "/admin/categories", hint: "Discoverable services" },
  ];
  const shortcuts = [
    { href: "/admin/applications", label: "Review partner applications", detail: "Verify businesses and professionals", Icon: ClipboardCheck },
    { href: "/admin/r/bookings", label: "Manage bookings", detail: "Monitor customer appointments", Icon: CalendarDays },
    { href: "/admin/r/partners", label: "Manage partners", detail: "Profiles, status and visibility", Icon: Store },
    { href: "/admin/refunds", label: "Review refunds", detail: "Inspect refund requests", Icon: CreditCard },
    { href: "/admin/r/tickets", label: "Resolve support tickets", detail: "Keep customer support moving", Icon: LifeBuoy },
    { href: "/admin/r/customers", label: "Customer directory", detail: "Review account records", Icon: Users },
  ];
  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="page-heading"><span className="section-kicker">Operations overview</span><h2 className="admin-page-title">Your marketplace at a glance</h2><p>Live counts and financial totals from your Saj Saathi database. Empty data stays empty; no sample figures are shown.</p></div>
        {onDays && <div className="flex flex-wrap gap-2" aria-label="Analytics period">{[7, 30, 90, 365].map((d) => <button key={d} className="chip" aria-pressed={d === days} onClick={() => onDays(d)}>{d === 365 ? "1 year" : `${d} days`}</button>)}</div>}
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-gradient-to-br from-[#173b32] to-[#285d4c] text-white p-5 shadow-sm"><p className="text-sm text-[#d7e7dc]">Completed booking value · {days} days</p><p className="mt-2 text-3xl font-bold tabular-nums">{inr(data.money.gmvPaise)}</p><p className="mt-1 text-xs text-[#c1d8c9]">Gross value of completed appointments</p></div>
        <div className="admin-kpi-card"><p>Commission earned · {days} days</p><p className="mt-2 text-3xl font-bold tabular-nums text-[#1e5046]">{inr(data.money.commissionPaise)}</p><p className="mt-1 text-xs muted">Platform commission recorded</p></div>
        <div className="admin-kpi-card"><p>Online collected · {days} days</p><p className="mt-2 text-3xl font-bold tabular-nums">{inr(data.money.onlineCollectedPaise)}</p><p className="mt-1 text-xs muted">Net of recorded refunds</p></div>
      </section>
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" aria-label="Marketplace metrics">
        {tiles.map((x) => { const inner = <><p className="text-2xl font-bold tabular-nums text-[#21372f]">{x.value.toLocaleString("en-IN")}</p><p className="mt-1 text-sm font-semibold">{x.label}</p><p className="mt-1 text-xs muted">{x.hint}</p></>; return x.href ? <Link key={x.label} href={x.href} className="admin-kpi-card panel-hover block">{inner}</Link> : <div key={x.label} className="admin-kpi-card">{inner}</div>; })}
      </section>
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-2"><div><span className="section-kicker">Shortcuts</span><h3 className="text-lg font-bold">Common admin tasks</h3></div><Activity className="text-[var(--color-teal-700)]" size={21} /></div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{shortcuts.map(({ href, label, detail, Icon }) => <Link key={href} href={href} className="admin-action-link"><span className="grid place-items-center size-10 rounded-xl bg-[#edf3ee] text-[#28675c]"><Icon size={19} /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{label}</strong><small className="block muted text-xs">{detail}</small></span><ArrowUpRight size={16} className="muted" /></Link>)}</div>
      </section>
      <section className="grid gap-3 xl:grid-cols-[1.4fr_.9fr]">
        <div className="panel p-4 sm:p-5 grid gap-3">
          <div><h3 className="text-lg font-bold">New bookings per day</h3><p className="muted text-sm">Daily booking volume during the selected period.</p></div>
          <div className="flex items-end gap-[3px] h-44 overflow-hidden" role="img" aria-label={`Bookings per day over ${days} days, peak ${max}`}>
            {data.bookingsPerDay.map((d) => <div key={d.date} title={`${d.date}: ${d.count}`} className="flex-1 min-w-[2px] bg-[#397565] rounded-t-sm min-h-[2px]" style={{ height: `${(d.count / max) * 100}%`, opacity: d.count ? 1 : 0.22 }} />)}
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-xs muted"><span>{data.bookingsPerDay[0]?.date ?? "—"} → {data.bookingsPerDay.at(-1)?.date ?? "—"}</span><span>Peak: {max} booking(s) per day</span></div>
        </div>
        <div className="panel p-4 sm:p-5 grid gap-3">
          <div><h3 className="text-lg font-bold">Top partners</h3><p className="muted text-sm">Ranked by completed bookings in this period.</p></div>
          {data.topPartners.length === 0 ? <p className="muted text-sm py-6">No completed partner bookings in this period yet.</p> : <ol className="grid gap-2">{data.topPartners.map((p, i) => <li key={p.id} className="flex gap-3 items-center border-b border-[var(--color-line)] pb-2 last:border-0"><span className="grid place-items-center size-8 rounded-full bg-[#edf3ee] text-sm font-bold text-[#28675c]">{i + 1}</span><Link className="flex-1 min-w-0 font-semibold text-sm truncate hover:underline" href={`/admin/applications/${p.id}`}>{p.name}</Link><span className="text-sm font-bold tabular-nums">{p.completed}</span></li>)}</ol>}
          <Link href="/admin/r/partners" className="text-sm font-semibold text-[var(--color-teal-800)] inline-flex items-center gap-1">View partners <ArrowRight size={15} /></Link>
        </div>
      </section>
    </div>
  );
}
