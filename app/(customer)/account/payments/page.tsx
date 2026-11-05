import Link from "next/link";
import type { Booking, Payment } from "@/lib/core/types";
import { getCtx } from "@/lib/server/ctx";
import { currentActor, dict, locale } from "@/lib/session";
import { dateTime, inr } from "@/lib/shared/format";
import { Empty, StatusBadge } from "@/lib/shared/ui";

export default async function PaymentsPage() {
  const [a, ctx, t, lang] = await Promise.all([currentActor(), getCtx(), dict(), locale()]);
  const ps = await ctx.repo.col<Payment>("payments").find({ customerId: a!.userId }, { sort: { createdAt: -1 }, limit: 100 });
  const bs = ps.length ? await ctx.repo.col<Booking>("bookings").find({ _id: { $in: ps.map((p) => p.bookingId) } }) : [];
  return (
    <div className="grid gap-4"><h2>{t.account.payments}</h2>
      {ps.length === 0 ? <Empty title={t.account.noPayments} /> : (
        <div className="panel overflow-x-auto"><table className="w-full min-w-[34rem] text-left">
          <thead className="bg-[var(--color-ivory)] text-sm"><tr className="[&_th]:p-3"><th>Date</th><th>{t.booking.service}</th><th>{t.booking.total}</th><th>Status</th><th>{t.account.receipt}</th></tr></thead>
          <tbody className="divide-y divide-[var(--color-line)]">{ps.map((p) => { const b = bs.find((x) => x._id === p.bookingId); return (
            <tr key={p._id} className="[&_td]:p-3"><td className="whitespace-nowrap">{dateTime(p.createdAt, lang)}</td><td>{b ? <Link className="underline" href={`/account/bookings/${b._id}`}>{b.serviceName}</Link> : "—"}</td><td className="tabular-nums">{inr(p.amountPaise, lang)}{p.refundedPaise ? <span className="block text-sm muted">−{inr(p.refundedPaise, lang)}</span> : null}</td><td><StatusBadge status={p.status} label={t.pay[p.status]} /></td><td className="tabular-nums text-sm">{p.receiptNo ?? "—"}</td></tr>
          ); })}</tbody>
        </table></div>
      )}
    </div>
  );
}
