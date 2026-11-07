"use client";
import { useState } from "react";
import { useData } from "@/lib/client";
import { dateOnly, inr } from "@/lib/shared/format";
import { LoadFailure, Spinner, StatusBadge } from "@/lib/shared/ui";
import { usePartner } from "@/components/Partner";

type Statement = { month: string; lines: { ref: string; date: string; service: string; servicePaise: number; commissionPaise: number; paidOnline: boolean }[]; penalties: { ref: string; penaltyPaise: number }[]; grossPaise: number; commissionPaise: number; penaltyPaise: number; netPaise: number };
type Prof = { plan?: { code: string; status: string; renewsAt?: string }; commissionPercent?: number; payouts: { _id: string; period: string; amountPaise: number; status: string; utr?: string }[]; plans: { _id: string; name: string; pricePaise?: number; interval?: string; benefits?: string[] }[]; onlinePayments: { id: string; amountPaise: number; refundedPaise: number; status: string; createdAt: string }[] };

export default function MoneyPage() {
  const { t, locale } = usePartner();
  const [month, setMonth] = useState(new Date(Date.now() + 330 * 60000).toISOString().slice(0, 7));
  const statement = useData<Statement>(`partner/statements?month=${month}`);
  const profile = useData<Prof>("partner/profile");
  const st = statement.data;
  const prof = profile.data;
  return (
    <div className="grid gap-5">
      <h1 className="text-2xl">{t.money.title}</h1>
      <label className="field max-w-xs"><span>{t.money.month}</span><input type="month" className="input" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
      {!st ? (statement.error ? <LoadFailure message={statement.error} onRetry={statement.reload} /> : <Spinner label={t.common.loading} />) : (
        <>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[[t.money.gross, st.grossPaise], [t.money.commission, -st.commissionPaise], [t.money.penalty, -st.penaltyPaise], [t.money.net, st.netPaise]].map(([l, v]) => <div key={String(l)} className="panel p-4"><dt className="muted">{l}</dt><dd className="text-xl font-semibold tabular-nums">{inr(Number(v), locale)}</dd></div>)}
          </dl>
          <section className="grid gap-2"><h2 className="text-lg">{t.money.lines} ({st.lines.length})</h2>
            {st.lines.length === 0 ? <p className="muted">{t.money.none}</p> : <div className="panel overflow-x-auto"><table className="w-full min-w-[30rem] text-left"><thead className="bg-[var(--color-ivory)] text-sm"><tr className="[&_th]:p-2"><th>Date</th><th>{t.bookings.service}</th><th className="text-right">₹</th><th className="text-right">{t.money.commission}</th></tr></thead>
              <tbody className="divide-y divide-[var(--color-line)]">{st.lines.map((l) => <tr key={l.ref} className="[&_td]:p-2"><td>{dateOnly(l.date, locale)}</td><td>{l.service} <span className="muted text-sm">{l.ref}</span></td><td className="text-right tabular-nums">{inr(l.servicePaise, locale)}</td><td className="text-right tabular-nums">{inr(l.commissionPaise, locale)}</td></tr>)}</tbody></table></div>}
          </section>
        </>
      )}
      {profile.error && !prof && <LoadFailure message={profile.error} onRetry={profile.reload} />}
      {prof && (
        <>
          <section className="panel p-4 grid gap-1"><h2 className="text-lg">{t.money.plan}</h2><p>{prof.plan?.code ?? "free"} · {prof.plan?.status ?? "none"}{prof.commissionPercent !== undefined ? ` · ${prof.commissionPercent}%` : ""}</p>{prof.plans.length > 0 && <ul className="muted text-[0.95rem]">{prof.plans.map((x) => <li key={x._id}>{x.name}: {inr(x.pricePaise, locale)} / {x.interval}</li>)}</ul>}</section>
          <section className="grid gap-2"><h2 className="text-lg">{t.money.payouts}</h2>
            {prof.payouts.length === 0 ? <p className="muted">{t.money.noPayouts}</p> : <ul className="panel divide-y divide-[var(--color-line)]">{prof.payouts.map((x) => <li key={x._id} className="p-3 flex gap-3"><span className="flex-1">{x.period}{x.utr ? <span className="muted text-sm"> · {x.utr}</span> : null}</span><span className="tabular-nums">{inr(x.amountPaise, locale)}</span><StatusBadge status={x.status} /></li>)}</ul>}
          </section>
          <section className="grid gap-2"><h2 className="text-lg">{t.money.online}</h2>
            {prof.onlinePayments.length === 0 ? <p className="muted">—</p> : <ul className="panel divide-y divide-[var(--color-line)]">{prof.onlinePayments.slice(0, 30).map((x) => <li key={x.id} className="p-3 flex gap-3"><span className="flex-1">{dateOnly(x.createdAt, locale)}</span><span className="tabular-nums">{inr(x.amountPaise - x.refundedPaise, locale)}</span><StatusBadge status={x.status} /></li>)}</ul>}
          </section>
        </>
      )}
    </div>
  );
}
