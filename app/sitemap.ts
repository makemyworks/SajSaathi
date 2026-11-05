import type { MetadataRoute } from "next";
import { getCtx } from "@/lib/server/ctx";
import type { Category, Provider } from "@/lib/core/types";
import { citiesWithProviders } from "@/lib/core/catalog";
import { BRAND } from "@/lib/shared/brand";

export const dynamic = "force-dynamic";
/** Only pages with real content: active categories, approved providers, cities that have providers. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = BRAND.urls.customer;
  const staticPages = ["", "/services", "/cities", "/how-it-works", "/about", "/partner", "/professional", "/help", "/faq", "/contact", "/accessibility", "/legal/privacy", "/legal/terms", "/legal/refunds"];
  const staticEntries = staticPages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.5 }));
  try {
    const ctx = await getCtx();
    const [cats, providers, cities] = await Promise.all([
      ctx.repo.col<Category>("categories").find({ status: "active", visible: true }),
      ctx.repo.col<Provider>("providers").find({ status: "approved" }, { limit: 5000 }),
      citiesWithProviders(ctx),
    ]);
    return [
      ...staticEntries,
      ...cats.map((c) => ({ url: `${base}/services/${c.slug}`, lastModified: c.updatedAt, priority: 0.8 })),
      ...cities.map((c) => ({ url: `${base}/cities/${encodeURIComponent(c.city.toLowerCase())}`, priority: 0.7 })),
      ...cities.flatMap((c) => c.localities.map((l) => ({ url: `${base}/cities/${encodeURIComponent(c.city.toLowerCase())}/${encodeURIComponent(l.toLowerCase())}`, priority: 0.5 }))),
      ...providers.flatMap((p) => [{ url: `${base}/p/${p.slug}`, lastModified: p.updatedAt, priority: 0.7 }, { url: `${base}/p/${p.slug}/prices`, lastModified: p.updatedAt, priority: 0.4 }]),
    ];
  } catch (error) {
    console.error("[Saj Saathi] Sitemap could not load live database entries:", error);
    return staticEntries;
  }
}
