import Link from "next/link";
import { searchProviders } from "@/lib/core/catalog";
import { getCtx } from "@/lib/server/ctx";
import { dict, locale } from "@/lib/session";
import { fmt } from "@/lib/shared/i18n";
import { Empty } from "@/lib/shared/ui";
import { ProviderRow } from "./ProviderRow";
import { Breadcrumbs } from "./Breadcrumbs";

export async function CityResults({ city, locality, category, localities }: { city: string; locality?: string; category?: string; localities: string[] }) {
  const [t, lang, ctx] = await Promise.all([dict(), locale(), getCtx()]);
  const res = await searchProviders(ctx, { city, locality, category, sort: "rating" });
  const slug = encodeURIComponent(city.toLowerCase());
  return (
    <div className="wrap py-8 grid gap-6">
      <Breadcrumbs items={[{ href: "/", label: "Saj Saathi" }, { href: "/cities", label: t.footer.cities }, { href: `/cities/${slug}`, label: city }, ...(locality ? [{ href: `/cities/${slug}/${encodeURIComponent(locality.toLowerCase())}`, label: locality }] : [])]} />
      <h1>{locality ? `${locality}, ${city}` : city}</h1>
      <p className="muted">{res.total === 1 ? t.search.resultsOne : fmt(t.search.results, { n: res.total })}</p>
      {localities.length > 0 && !locality && (
        <nav aria-label="Localities" className="flex flex-wrap gap-2">
          {localities.map((l) => <Link key={l} className="chip" href={`/cities/${slug}/${encodeURIComponent(l.toLowerCase())}`}>{l}</Link>)}
        </nav>
      )}
      {res.total === 0 ? <Empty title={t.search.empty} body={t.search.emptyHint} /> : <ul className="panel px-4 sm:px-6">{res.providers.map((p) => <ProviderRow key={p.id} p={p} t={t} locale={lang} />)}</ul>}
    </div>
  );
}
