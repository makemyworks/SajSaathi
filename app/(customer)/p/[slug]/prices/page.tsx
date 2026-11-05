import type { Metadata } from "next";
import Link from "next/link";
import { loadProvider } from "@/lib/provider-page";
import { dict, locale } from "@/lib/session";
import { fmt, pick } from "@/lib/shared/i18n";
import { inr } from "@/lib/shared/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";

type P = Promise<{ slug: string }>;
export async function generateMetadata({ params }: { params: P }): Promise<Metadata> { const p = await loadProvider((await params).slug); return { title: `Prices — ${p.name}`, alternates: { canonical: `/p/${p.slug}/prices` } }; }
export default async function PricesPage({ params }: { params: P }) {
  const [p, t, lang] = await Promise.all([loadProvider((await params).slug), dict(), locale()]);
  return (
    <div className="wrap py-8 grid gap-6 max-w-3xl">
      <Breadcrumbs items={[{ href: "/", label: "Saj Saathi" }, { href: `/p/${p.slug}`, label: p.name }, { href: `/p/${p.slug}/prices`, label: t.provider.services }]} />
      <h1>{t.provider.services} — {p.name}</h1>
      {p.categories.map((c) => { const ss = p.services.filter((s) => s.categoryId === c.id); if (!ss.length) return null; return (
        <section key={c.id} className="grid gap-2"><h2 className="text-xl">{pick(c.name, lang)}</h2>
          <div className="panel overflow-x-auto"><table className="w-full text-left"><thead className="bg-[var(--color-ivory)] text-sm"><tr className="[&_th]:p-3"><th>{t.booking.service}</th><th>{fmt(t.provider.minutes, { n: "" }).trim()}</th><th className="text-right">₹</th></tr></thead>
            <tbody className="divide-y divide-[var(--color-line)]">{ss.map((s) => <tr key={s.id} className="[&_td]:p-3"><td><Link className="underline underline-offset-4" href={`/p/${p.slug}/services/${s.id}`}>{s.name}</Link>{s.addOns.length > 0 && <span className="block muted text-sm">{s.addOns.map((a) => `${a.name} +${inr(a.pricePaise, lang)}`).join(" · ")}</span>}</td><td className="tabular-nums">{s.durationMin}</td><td className="text-right tabular-nums font-semibold">{inr(s.pricePaise, lang)}</td></tr>)}</tbody>
          </table></div>
        </section>
      ); })}
      {p.atHome && p.travelFeePaise ? <p>{t.booking.travel}: {inr(p.travelFeePaise, lang)}</p> : null}
      <Link href={`/book/${p.slug}`} className="btn btn-primary btn-xl">{t.provider.bookNow}</Link>
    </div>
  );
}
