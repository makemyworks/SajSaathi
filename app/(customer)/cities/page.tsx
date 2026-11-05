import type { Metadata } from "next";
import Link from "next/link";
import { citiesWithProviders } from "@/lib/core/catalog";
import { getCtx } from "@/lib/server/ctx";
import { dict } from "@/lib/session";
import { Empty } from "@/lib/shared/ui";

export const metadata: Metadata = { title: "Cities", description: "Cities where Saj Saathi has verified providers." };
export const revalidate = 300;

/** Only cities with at least one approved provider are listed — we never claim coverage we don't have. */
export default async function CitiesPage() {
  const [t, ctx] = await Promise.all([dict(), getCtx()]);
  const cities = await citiesWithProviders(ctx);
  return (
    <div className="wrap py-8 grid gap-6">
      <h1>{t.footer.cities}</h1>
      {cities.length === 0 ? <Empty title={t.home.nearbyEmpty} action={<Link className="btn btn-outline" href="/contact?topic=area">{t.home.nearbyEmptyCta}</Link>} /> : (
        <ul className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {cities.map((c) => (
            <li key={c.city}><Link href={`/cities/${encodeURIComponent(c.city.toLowerCase())}`} className="panel p-5 grid gap-1 hover:border-[var(--color-teal-700)]">
              <span className="font-semibold text-lg">{c.city}</span><span className="muted">{c.state} · {c.count}</span>
            </Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}
