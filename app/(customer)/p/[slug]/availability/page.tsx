import type { Metadata } from "next";
import Link from "next/link";
import { getSlots } from "@/lib/core/bookings";
import { getCtx } from "@/lib/server/ctx";
import { loadProvider } from "@/lib/provider-page";
import { dict, locale } from "@/lib/session";
import { istDate, dayLabel } from "@/lib/shared/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";
type P = Promise<{ slug: string }>;
export async function generateMetadata({ params }: { params: P }): Promise<Metadata> { const p = await loadProvider((await params).slug); return { title: `Free times — ${p.name}`, robots: { index: false } }; }

/** Next 7 days of free times for a service (default: first service). Live from the same slot engine the booking uses. */
export default async function AvailabilityPage({ params, searchParams }: { params: P; searchParams: Promise<{ service?: string }> }) {
  const [p, t, lang, ctx, sp] = await Promise.all([loadProvider((await params).slug), dict(), locale(), getCtx(), searchParams]);
  const service = p.services.find((s) => s.id === sp.service) ?? p.services[0];
  const days = service ? await Promise.all(Array.from({ length: 7 }, (_, i) => istDate(i)).map(async (d) => ({ d, r: await getSlots(ctx, { providerId: p.id, serviceId: service.id, date: d }).catch(() => ({ slots: [] as { time: string; start: string }[] })) }))) : [];
  return (
    <div className="wrap py-8 grid gap-6 max-w-3xl">
      <Breadcrumbs items={[{ href: "/", label: "Saj Saathi" }, { href: `/p/${p.slug}`, label: p.name }, { href: `/p/${p.slug}/availability`, label: t.booking.chooseTime }]} />
      <h1>{t.booking.chooseTime} — {p.name}</h1>
      <nav className="flex flex-wrap gap-2" aria-label={t.booking.chooseService}>{p.services.map((s) => <Link key={s.id} className="chip" aria-current={s.id === service?.id ? "page" : undefined} href={`/p/${p.slug}/availability?service=${s.id}`}>{s.name}</Link>)}</nav>
      <ul className="grid gap-3">
        {days.map(({ d, r }) => { const l = dayLabel(d, lang); return (
          <li key={d} className="panel p-4 grid gap-2">
            <p className="font-semibold">{l.day} {l.num} {l.month}</p>
            {r.slots.length === 0 ? <p className="muted">{t.booking.noSlots}</p> : <div className="flex flex-wrap gap-2">{r.slots.slice(0, 12).map((s) => <Link key={s.start} className="chip tabular-nums" href={`/book/${p.slug}?service=${service!.id}&date=${d}`}>{s.time}</Link>)}{r.slots.length > 12 && <span className="muted self-center">+{r.slots.length - 12}</span>}</div>}
          </li>
        ); })}
      </ul>
    </div>
  );
}
