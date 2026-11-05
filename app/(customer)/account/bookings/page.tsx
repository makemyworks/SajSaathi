import Link from "next/link";
import { listBookings } from "@/lib/core/bookings";
import { getCtx } from "@/lib/server/ctx";
import { currentActor, dict, locale } from "@/lib/session";
import { dateTime, inr } from "@/lib/shared/format";
import { Empty, StatusBadge } from "@/lib/shared/ui";

type Tab = "upcoming" | "completed" | "cancelled";
export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab: Tab = ((await searchParams).tab as Tab) || "upcoming";
  const [actor, ctx, t, lang] = await Promise.all([currentActor(), getCtx(), dict(), locale()]);
  const list = await listBookings(ctx, actor!, { scope: tab, limit: 100 });
  const tabs: [Tab, string][] = [["upcoming", t.account.upcoming], ["completed", t.account.completed], ["cancelled", t.account.cancelled]];
  return (
    <div className="grid gap-4">
      <h2>{t.account.bookings}</h2>
      <nav className="flex gap-2" aria-label={t.account.bookings}>{tabs.map(([k, l]) => <Link key={k} href={`/account/bookings?tab=${k}`} className="chip" aria-current={tab === k ? "page" : undefined}>{l}</Link>)}</nav>
      {list.length === 0 ? <Empty title={t.account.noBookings} action={<Link href="/services" className="btn btn-primary">{t.account.findService}</Link>} /> : (
        <ul className="panel divide-y divide-[var(--color-line)]">
          {list.map((b) => (
            <li key={b._id}><Link href={`/account/bookings/${b._id}`} className="p-4 grid sm:grid-cols-[1fr_auto] gap-2 hover:bg-[var(--color-ivory)]">
              <span className="grid gap-1"><span className="font-semibold">{b.serviceName}</span><span className="muted">{dateTime(b.start, lang)} · {b.ref}</span></span>
              <span className="flex sm:flex-col items-center sm:items-end gap-2"><StatusBadge status={b.status} label={t.status[b.status]} /><span className="tabular-nums">{inr(b.price.totalPaise, lang)}</span></span>
            </Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}
