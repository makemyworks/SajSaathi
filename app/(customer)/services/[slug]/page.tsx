import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategory, publicCategory, searchProviders, citiesWithProviders } from "@/lib/core/catalog";
import { getCtx } from "@/lib/server/ctx";
import { dict, locale } from "@/lib/session";
import { fmt, pick } from "@/lib/shared/i18n";
import { Empty } from "@/lib/shared/ui";
import { ProviderRow } from "@/components/ProviderRow";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AppError } from "@/lib/core/util";

export const dynamic = "force-dynamic";
type P = Promise<{ slug: string }>;

async function load(slug: string) {
  const ctx = await getCtx();
  try { return { ctx, cat: await getCategory(ctx, slug) }; } catch (e) { if (e instanceof AppError && e.status === 404) notFound(); throw e; }
}

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { cat } = await load((await params).slug);
  return { title: cat.seo?.title?.en || cat.name.en, description: cat.seo?.description?.en || cat.description?.en, alternates: { canonical: `/services/${cat.slug}` } };
}

export default async function CategoryPage({ params }: { params: P }) {
  const { slug } = await params;
  const { ctx, cat } = await load(slug);
  const [t, lang] = await Promise.all([dict(), locale()]);
  const c = publicCategory(cat);
  const [res, cities] = await Promise.all([searchProviders(ctx, { category: slug, sort: "rating" }), citiesWithProviders(ctx)]);
  return (
    <div className="wrap py-8 grid gap-6">
      <Breadcrumbs items={[{ href: "/", label: "Saj Saathi" }, { href: "/services", label: t.nav.services }, { href: `/services/${slug}`, label: pick(c.name, lang) }]} />
      <div className="grid gap-2 max-w-3xl">
        <h1>{pick(c.name, lang)}</h1>
        <p className="muted text-lg">{pick(c.description, lang)}</p>
        {c.safetyNotice && <p className="text-[var(--color-gold-ink)] font-medium">{pick(c.safetyNotice, lang)}</p>}
        <p className="text-[0.95rem]">{fmt(t.provider.freeUntil, { h: c.cancellationPolicy.freeUntilHours })}{c.cancellationPolicy.lateFeePercent ? ` ${fmt(t.provider.lateFee, { p: c.cancellationPolicy.lateFeePercent })}` : ""}</p>
      </div>
      {cities.length > 0 && (
        <nav aria-label={t.footer.cities} className="flex flex-wrap gap-2">
          {cities.map((x) => <Link key={x.city} className="chip" href={`/cities/${encodeURIComponent(x.city.toLowerCase())}?category=${slug}`}>{x.city}</Link>)}
        </nav>
      )}
      {res.total === 0 ? <Empty title={t.search.empty} body={t.search.emptyHint} /> : (
        <ul className="panel px-4 sm:px-6">{res.providers.map((p) => <ProviderRow key={p.id} p={p} t={t} locale={lang} />)}</ul>
      )}
    </div>
  );
}
