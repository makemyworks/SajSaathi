import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { loadProvider } from "@/lib/provider-page";
import { dict, locale } from "@/lib/session";
import { fmt, pick } from "@/lib/shared/i18n";
import { inr } from "@/lib/shared/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";

type P = Promise<{ slug: string; serviceId: string }>;
export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { slug, serviceId } = await params; const p = await loadProvider(slug); const s = p.services.find((x) => x.id === serviceId);
  return s ? { title: `${s.name} at ${p.name}`, description: `${s.name} — ${(s.pricePaise / 100).toFixed(0)} INR, ${s.durationMin} min. ${s.description ?? ""}`.slice(0, 155) } : {};
}
export default async function ServicePage({ params }: { params: P }) {
  const { slug, serviceId } = await params;
  const [p, t, lang] = await Promise.all([loadProvider(slug), dict(), locale()]);
  const s = p.services.find((x) => x.id === serviceId);
  if (!s) notFound();
  const cat = p.categories.find((c) => c.id === s.categoryId);
  return (
    <div className="wrap py-8 grid gap-6 max-w-3xl">
      <Breadcrumbs items={[{ href: "/", label: "Saj Saathi" }, { href: `/p/${p.slug}`, label: p.name }, { href: `/p/${p.slug}/services/${s.id}`, label: s.name }]} />
      <div className="grid gap-2">
        <h1>{s.name}</h1>
        <p className="muted">{p.name}{cat ? ` · ${pick(cat.name, lang)}` : ""}</p>
      </div>
      <div className="panel p-6 grid gap-4">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <strong className="text-3xl tabular-nums" style={{ fontFamily: "var(--font-display)" }}>{inr(s.pricePaise, lang)}</strong>
          <span className="inline-flex items-center gap-1 muted"><Clock aria-hidden size={16} />{fmt(t.provider.minutes, { n: s.durationMin })}</span>
        </div>
        {s.description && <p className="whitespace-pre-line">{s.description}</p>}
        {s.isPackage && s.packageItems?.length ? <ul className="list-disc pl-5">{s.packageItems.map((x) => <li key={x}>{x}</li>)}</ul> : null}
        {s.eligibility && <p><strong>{t.common.required}:</strong> {s.eligibility}</p>}
        {s.addOns.length > 0 && (
          <div><p className="font-semibold mb-1">{t.provider.addOns}</p>
            <table className="w-full"><tbody>{s.addOns.map((a) => <tr key={a.id} className="border-b border-[var(--color-line)] last:border-0"><td className="py-1.5">{a.name}{a.durationMin ? <span className="muted"> · +{a.durationMin} min</span> : null}</td><td className="text-right tabular-nums">+{inr(a.pricePaise, lang)}</td></tr>)}</tbody></table>
          </div>
        )}
        {cat?.safetyNotice && <p className="text-[var(--color-gold-ink)]">{pick(cat.safetyNotice, lang)}</p>}
        <Link href={`/book/${p.slug}?service=${s.id}`} className="btn btn-primary btn-xl">{t.provider.bookNow}</Link>
      </div>
    </div>
  );
}
