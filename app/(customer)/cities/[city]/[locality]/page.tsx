import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { citiesWithProviders } from "@/lib/core/catalog";
import { getCtx } from "@/lib/server/ctx";
import { CityResults } from "@/components/CityResults";

export const dynamic = "force-dynamic";
type P = Promise<{ city: string; locality: string }>;
async function find(city: string, loc: string) {
  const all = await citiesWithProviders(await getCtx());
  const c = all.find((x) => x.city.toLowerCase() === decodeURIComponent(city));
  const l = c?.localities.find((x) => x.toLowerCase() === decodeURIComponent(loc));
  return c && l ? { c, l } : null;
}
export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const p = await params; const f = await find(p.city, p.locality);
  return f ? { title: `${f.l}, ${f.c.city} — verified providers`, description: `Book salons, grooming and wellness providers in ${f.l}, ${f.c.city}.` } : {};
}
export default async function LocalityPage({ params }: { params: P }) {
  const p = await params; const f = await find(p.city, p.locality);
  if (!f) notFound();
  return <CityResults city={f.c.city} locality={f.l} localities={[]} />;
}
