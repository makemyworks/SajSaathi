import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { citiesWithProviders } from "@/lib/core/catalog";
import { getCtx } from "@/lib/server/ctx";
import { CityResults } from "@/components/CityResults";

export const dynamic = "force-dynamic";
type P = Promise<{ city: string }>;
async function find(slug: string) { const all = await citiesWithProviders(await getCtx()); return all.find((c) => c.city.toLowerCase() === decodeURIComponent(slug)); }

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const c = await find((await params).city);
  return c ? { title: `Salons, grooming & wellness in ${c.city}`, description: `Book verified providers in ${c.city}, ${c.state}. Real prices, free times, reviews from completed bookings.`, alternates: { canonical: `/cities/${encodeURIComponent(c.city.toLowerCase())}` } } : {};
}
export default async function CityPage({ params, searchParams }: { params: P; searchParams: Promise<{ category?: string }> }) {
  const c = await find((await params).city);
  if (!c) notFound(); // no empty SEO pages for cities without providers
  return <CityResults city={c.city} category={(await searchParams).category} localities={c.localities} />;
}
