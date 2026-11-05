import type { Metadata } from "next";
import Link from "next/link";
import { listCategories } from "@/lib/core/catalog";
import { getCtx } from "@/lib/server/ctx";
import { dict, locale } from "@/lib/session";
import { pick } from "@/lib/shared/i18n";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = { title: "Services", description: "Salon & grooming, bridal & occasions, massage & wellness, pet grooming and senior fitness — book verified providers." };
export const revalidate = 300;

export default async function ServicesPage() {
  const [t, lang, ctx] = await Promise.all([dict(), locale(), getCtx()]);
  const cats = await listCategories(ctx);
  return (
    <div className="wrap py-8 grid gap-8">
      <Breadcrumbs items={[{ href: "/", label: "Saj Saathi" }, { href: "/services", label: t.nav.services }]} />
      <h1>{t.home.categoriesTitle}</h1>
      <ul className="grid gap-4 md:grid-cols-2">
        {cats.map((c) => (
          <li key={c.id} className="panel p-6 grid gap-3 content-start">
            <div className="flex items-center gap-3">
              <span className="size-11 rounded-full bg-[var(--color-teal-50)] text-[var(--color-teal-800)] grid place-items-center"><CategoryIcon name={c.icon} size={22} /></span>
              <h2 className="text-xl">{pick(c.name, lang)}</h2>
            </div>
            <p className="muted">{pick(c.description, lang)}</p>
            {c.safetyNotice && <p className="text-[var(--color-gold-ink)] text-[0.95rem]">{pick(c.safetyNotice, lang)}</p>}
            <div className="flex gap-2 flex-wrap">
              <Link href={`/services/${c.slug}`} className="btn btn-primary btn-sm">{t.search.title}</Link>
              {c.atHomeAllowed && <Link href={`/providers?category=${c.slug}&mode=at_home`} className="btn btn-outline btn-sm">{t.search.modeHome}</Link>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
