import type { Metadata } from "next";
import Link from "next/link";
import { listCategories, searchProviders } from "@/lib/core/catalog";
import { getCtx } from "@/lib/server/ctx";
import { dict, locale } from "@/lib/session";
import { fmt, pick } from "@/lib/shared/i18n";
import { Empty } from "@/lib/shared/ui";
import { ProviderRow } from "@/components/ProviderRow";
import { SearchFilters } from "@/components/SearchFilters";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";
type SP = Promise<Record<string, string | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const where = sp.city ? ` in ${sp.city}` : "";
  // Filtered result pages are not indexed (avoids thin duplicate pages); category & city pages are.
  return { title: `Find providers${where}`, robots: { index: false, follow: true } };
}

export default async function ProvidersPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [t, lang] = await Promise.all([dict(), locale()]);
  type SearchResult = Awaited<ReturnType<typeof searchProviders>>;
  let cats: Awaited<ReturnType<typeof listCategories>> = [];
  let res: SearchResult = { providers: [], total: 0, category: null };
  let marketplaceReady = false;
  try {
    const ctx = await getCtx();
    cats = await listCategories(ctx);
    if (cats.length > 0) {
      const mode = sp.mode === "at_home" || sp.mode === "in_store" ? sp.mode : undefined;
      const sort = sp.sort === "rating" || sp.sort === "price_low" || sp.sort === "price_high" ? sp.sort : undefined;
      res = await searchProviders(ctx, { q: sp.q, category: sp.category, city: sp.city, locality: sp.locality, pin: sp.pin, mode, sort, minRating: sp.rating ? Number(sp.rating) : undefined, maxPricePaise: sp.maxPrice ? Number(sp.maxPrice) * 100 : undefined, page: sp.page ? Number(sp.page) : 1 });
      marketplaceReady = true;
    }
  } catch (error) {
    console.error("[Saj Saathi] Provider directory is unavailable:", error);
  }
  const atHomeAllowed = res.category ? res.category.atHomeAllowed : true;
  const heading = res.category ? pick(res.category.name, lang) : t.search.title;
  return (
    <div className="wrap py-8 grid gap-6">
      <Breadcrumbs items={[{ href: "/", label: "Saj Saathi" }, { href: "/providers", label: t.nav.providers }]} />
      <div className="grid gap-1">
        <h1>{heading}{sp.city ? ` · ${sp.city}` : ""}</h1>
        {marketplaceReady && <p className="muted">{res.total === 1 ? t.search.resultsOne : fmt(t.search.results, { n: res.total })}</p>}
        {res.category?.safetyNotice && <p className="text-[var(--color-gold-ink)]">{pick(res.category.safetyNotice, lang)}</p>}
      </div>
      {!marketplaceReady ? (
        <div className="panel p-6 grid gap-2" role="status">
          <h2 className="text-lg">Live provider search is not connected yet.</h2>
          <p className="muted">The directory will show approved providers after the site owner connects MongoDB and completes the one-time database setup. No sample salons or prices are being shown as real listings.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[18rem_1fr] gap-6 items-start">
          <SearchFilters categories={cats.map((c) => ({ slug: c.slug, name: c.name }))} atHomeAllowed={atHomeAllowed} />
          {res.total === 0 ? (
            <Empty title={t.search.empty} body={t.search.emptyHint} action={<Link className="btn btn-outline" href="/providers">{t.search.allCategories}</Link>} />
          ) : (
            <ul className="panel px-4 sm:px-6">
              {res.providers.map((p) => <ProviderRow key={p.id} p={p} t={t} locale={lang} />)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
