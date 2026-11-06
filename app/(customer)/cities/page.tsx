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
  const t = await dict();
  let cities: Awaited<ReturnType<typeof citiesWithProviders>> = [];
  let marketplaceReady = true;
  try {
    cities = await citiesWithProviders(await getCtx());
  } catch (error) {
    marketplaceReady = false;
    console.error("[Saj Saathi] City directory is unavailable:", error);
  }
  return (
    <div className="wrap py-8 grid gap-6">
      <h1>{t.footer.cities}</h1>
      {!marketplaceReady ? (
        <div className="panel p-6" role="status"><p className="font-semibold">City coverage is being prepared.</p><p className="muted mt-2">Verified city listings will appear after the site owner connects MongoDB and completes the one-time database setup.</p></div>
      ) : cities.length === 0 ? <Empty title={t.home.nearbyEmpty} action={<Link className="btn btn-outline" href="/contact?topic=area">{t.home.nearbyEmptyCta}</Link>} /> : (
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
