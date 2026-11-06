import type { Metadata } from "next";
import Link from "next/link";
import { listCategories, publicCategory } from "@/lib/core/catalog";
import { getCtx } from "@/lib/server/ctx";
import { dict, locale } from "@/lib/session";
import { pick } from "@/lib/shared/i18n";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { seedCategories } from "@/lib/core/seed";
import type { Category } from "@/lib/core/types";

export const metadata: Metadata = { title: "Services", description: "Salon & grooming, bridal & occasions, massage & wellness, pet grooming and senior fitness — book verified providers." };
export const revalidate = 300;

export default async function ServicesPage() {
  const [t, lang] = await Promise.all([dict(), locale()]);
  let cats: Awaited<ReturnType<typeof listCategories>> = [];
  let catalogueReady = true;
  try {
    cats = await listCategories(await getCtx());
    if (cats.length === 0) catalogueReady = false;
  } catch (error) {
    catalogueReady = false;
    console.error("[Saj Saathi] Services catalogue could not be loaded:", error);
  }
  if (!catalogueReady) {
    cats = seedCategories(new Date()).map((category, index) =>
      publicCategory({ _id: `preview-${index}`, ...category } as Category),
    );
  }
  return (
    <div className="wrap py-8 grid gap-8">
      <Breadcrumbs items={[{ href: "/", label: "Saj Saathi" }, { href: "/services", label: t.nav.services }]} />
      <h1>{t.home.categoriesTitle}</h1>
      {!catalogueReady && (
        <div className="panel p-4 border-l-4 border-l-[var(--color-gold)]" role="status">
          <p className="font-semibold">Service catalogue preview</p>
          <p className="muted text-sm">These are preview categories only. Live search and booking will open after the site owner connects MongoDB and completes the one-time database setup.</p>
        </div>
      )}
      <ul className="grid gap-4 md:grid-cols-2">
        {cats.map((c) => (
          <li key={c.id} className="panel p-6 grid gap-3 content-start">
            <div className="flex items-center gap-3">
              <span className="size-11 rounded-full bg-[var(--color-teal-50)] text-[var(--color-teal-800)] grid place-items-center"><CategoryIcon name={c.icon} size={22} /></span>
              <h2 className="text-xl">{pick(c.name, lang)}</h2>
            </div>
            <p className="muted">{pick(c.description, lang)}</p>
            {c.safetyNotice && <p className="text-[var(--color-gold-ink)] text-[0.95rem]">{pick(c.safetyNotice, lang)}</p>}
            {catalogueReady ? (
              <div className="flex gap-2 flex-wrap">
                <Link href={`/services/${c.slug}`} className="btn btn-primary btn-sm">{t.search.title}</Link>
                {c.atHomeAllowed && <Link href={`/providers?category=${c.slug}&mode=at_home`} className="btn btn-outline btn-sm">{t.search.modeHome}</Link>}
              </div>
            ) : <p className="muted text-sm">Booking will be available after marketplace setup.</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
