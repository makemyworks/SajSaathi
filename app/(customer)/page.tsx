import Link from "next/link";
import { Home as HomeIcon, ShieldCheck, IndianRupee, MessageSquareQuote, LifeBuoy } from "lucide-react";
import { cookies } from "next/headers";
import { listCategories, searchProviders, citiesWithProviders, publicCategory } from "@/lib/core/catalog";
import { getCtx } from "@/lib/server/ctx";
import { dict, locale } from "@/lib/session";
import { pick } from "@/lib/shared/i18n";
import { HeroSearch } from "@/components/HeroSearch";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ProviderRow } from "@/components/ProviderRow";
import { InstallButton } from "@/components/InstallButton";
import { BRAND } from "@/lib/shared/brand";
import type { Category } from "@/lib/core/types";
import { seedCategories } from "@/lib/core/seed";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [t, lang] = await Promise.all([dict(), locale()]);
  const city = (await cookies()).get("ss_city")?.value;
  type SearchResult = Awaited<ReturnType<typeof searchProviders>>;
  type Promotion = { _id: string; title: string; body?: string; couponCode?: string; validTo?: Date };
  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  let cities: Awaited<ReturnType<typeof citiesWithProviders>> = [];
  let nearby: SearchResult = { providers: [], total: 0, category: null };
  let atHome: SearchResult = { providers: [], total: 0, category: null };
  let livePromos: Promotion[] = [];
  let marketplaceReady = true;

  try {
    const ctx = await getCtx();
    const [dbCategories, dbCities, dbNearby, dbAtHome, promotions] = await Promise.all([
      listCategories(ctx),
      citiesWithProviders(ctx),
      searchProviders(ctx, { city, sort: "rating" }),
      searchProviders(ctx, { city, mode: "at_home", sort: "rating" }),
      ctx.repo.col<Promotion>("promotions").find({ active: true }, { sort: { updatedAt: -1 }, limit: 3 }),
    ]);
    categories = dbCategories;
    cities = dbCities;
    nearby = dbNearby;
    atHome = dbAtHome;
    livePromos = promotions.filter((p) => !p.validTo || p.validTo > new Date());
    // A reachable but unseeded database must not make the homepage look broken
    // or imply that the live catalogue is ready. Preview categories are static
    // catalogue definitions only; they are deliberately not linked to booking.
    if (dbCategories.length === 0) {
      marketplaceReady = false;
      categories = seedCategories(new Date()).map((category, index) =>
        publicCategory({ _id: `preview-${index}`, ...category } as Category),
      );
    }
  } catch (error) {
    marketplaceReady = false;
    // Never fabricate providers, prices, ratings or bookings. Seed categories are
    // static catalogue definitions only and allow the public home page to render.
    console.error("[Saj Saathi] Customer homepage data could not be loaded:", error);
    categories = seedCategories(new Date()).map((category, index) =>
      publicCategory({ _id: `preview-${index}`, ...category } as Category),
    );
  }

  const trustIcons = [ShieldCheck, IndianRupee, MessageSquareQuote, LifeBuoy];

  return (
    <>
      {!marketplaceReady && (
        <section className="wrap pt-5" aria-live="polite">
          <div className="panel p-4 border-l-4 border-l-[var(--color-gold)] grid gap-1">
            <p className="font-semibold">Saj Saathi is preparing its live marketplace.</p>
            <p className="muted text-sm">You can preview the service categories, but live provider search and bookings are temporarily unavailable. The site owner should check the Vercel runtime logs and MongoDB Atlas connection settings.</p>
          </div>
        </section>
      )}

      <section className="bg-[var(--color-teal-800)] relative overflow-hidden">
        <img aria-hidden alt="" src="/brand/logo-symbol.svg" width={420} height={420} className="absolute -right-28 -bottom-28 w-[26rem] opacity-[0.08] pointer-events-none select-none" />
        <div className="wrap py-14 sm:py-20 grid gap-6 relative">
          {marketplaceReady ? (
            <HeroSearch categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} cities={cities.map((c) => c.city)} />
          ) : (
            <h1 className="text-[clamp(1.8rem,1rem+3.2vw,3.1rem)] leading-[1.2] text-white" style={{ fontFamily: "var(--font-display)" }}>Discover trusted services. Compare prices. Book with confidence.</h1>
          )}
          <p className="text-[var(--color-teal-100)] max-w-[56ch] text-lg">{marketplaceReady ? t.hero.sub : "Our service categories are ready. Live provider search and booking will open once the marketplace connection is restored."}</p>
        </div>
      </section>

      <section className="wrap py-12 grid gap-6" aria-labelledby="cats">
        <h2 id="cats">{t.home.categoriesTitle}</h2>
        <ul className="grid sm:grid-cols-2 gap-x-10">
          {categories.map((c) => (
            <li key={c.id} className="border-b border-[var(--color-line)]">
              {marketplaceReady ? (
                <Link href={`/services/${c.slug}`} className="flex gap-4 py-5 group">
                  <span className="size-12 shrink-0 rounded-full bg-[var(--color-teal-50)] text-[var(--color-teal-800)] grid place-items-center"><CategoryIcon name={c.icon} size={22} /></span>
                  <span className="grid gap-1">
                    <span className="text-lg font-semibold group-hover:underline underline-offset-4">{pick(c.name, lang)}</span>
                    <span className="muted">{pick(c.description, lang)}</span>
                    {c.safetyNotice && <span className="text-sm text-[var(--color-gold-ink)]">{pick(c.safetyNotice, lang)}</span>}
                  </span>
                </Link>
              ) : (
                <div className="flex gap-4 py-5">
                  <span className="size-12 shrink-0 rounded-full bg-[var(--color-teal-50)] text-[var(--color-teal-800)] grid place-items-center"><CategoryIcon name={c.icon} size={22} /></span>
                  <span className="grid gap-1">
                    <span className="text-lg font-semibold">{pick(c.name, lang)}</span>
                    <span className="muted">{pick(c.description, lang)}</span>
                    {c.safetyNotice && <span className="text-sm text-[var(--color-gold-ink)]">{pick(c.safetyNotice, lang)}</span>}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="wrap pb-6 grid gap-4" aria-labelledby="nearby">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h2 id="nearby">{city ? `${t.home.nearbyTitle} — ${city}` : t.home.nearbyTitle}</h2>
          {marketplaceReady && nearby.total > 0 && <Link href={`/providers${city ? `?city=${encodeURIComponent(city)}` : ""}`} className="font-semibold underline underline-offset-4">{t.nav.providers}</Link>}
        </div>
        {nearby.total === 0 ? (
          <div className="panel p-6 grid gap-3">
            <p>{marketplaceReady ? t.home.nearbyEmpty : "Live provider listings will appear here once the marketplace database connection is restored."}</p>
            {marketplaceReady && <div><Link href="/contact?topic=area" className="btn btn-outline btn-sm">{t.home.nearbyEmptyCta}</Link></div>}
          </div>
        ) : (
          <ul className="panel px-4 sm:px-6">{nearby.providers.slice(0, 5).map((p) => <ProviderRow key={p.id} p={p} t={t} locale={lang} />)}</ul>
        )}
      </section>

      {livePromos.length > 0 && (
        <section className="wrap py-6" aria-labelledby="offers">
          <h2 id="offers" className="mb-4">{t.footer.offers}</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {livePromos.map((p) => (
              <li key={p._id} className="panel p-5 border-l-4 border-l-[var(--color-gold)] grid gap-1">
                <p className="font-semibold">{p.title}</p>
                {p.body && <p className="muted">{p.body}</p>}
                {p.couponCode && <p>Code: <strong className="tabular-nums tracking-wide">{p.couponCode}</strong></p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-[var(--color-sand)] mt-10">
        <div className="wrap py-12 grid md:grid-cols-[1fr_1.4fr] gap-8 items-start">
          <div className="grid gap-3">
            <HomeIcon aria-hidden className="text-[var(--color-teal-800)]" size={28} />
            <h2>{t.home.atHomeTitle}</h2>
            <p className="muted max-w-[42ch]">{t.home.atHomeBody}</p>
          </div>
          {atHome.total > 0 ? (
            <ul className="panel px-4 sm:px-6">{atHome.providers.slice(0, 3).map((p) => <ProviderRow key={p.id} p={p} t={t} locale={lang} />)}</ul>
          ) : (
            <p className="muted self-center">{marketplaceReady ? t.home.nearbyEmpty : "At-home provider listings will appear once the marketplace connection is restored."}</p>
          )}
        </div>
      </section>

      <section className="wrap py-14 grid gap-8" aria-labelledby="trust">
        <h2 id="trust">{t.home.trustTitle}</h2>
        <dl className="grid sm:grid-cols-2 gap-x-10 gap-y-8">
          {t.home.trust.map((x, i) => { const I = trustIcons[i]; return (
            <div key={x.t} className="flex gap-4">
              <I aria-hidden size={24} className="shrink-0 text-[var(--color-gold-ink)] mt-1" />
              <div><dt className="font-semibold text-lg">{x.t}</dt><dd className="muted mt-1">{x.b}</dd></div>
            </div>
          ); })}
        </dl>
      </section>

      <section className="wrap pb-14 grid gap-6" aria-labelledby="steps">
        <h2 id="steps">{t.home.stepsTitle}</h2>
        <ol className="grid sm:grid-cols-4 gap-6">
          {t.home.steps.map((s, i) => (
            <li key={s.t} className="grid gap-2 border-t-2 border-[var(--color-teal-800)] pt-4">
              <span className="text-[var(--color-gold-ink)] font-semibold tabular-nums">{i + 1}</span>
              <span className="font-semibold text-lg">{s.t}</span>
              <span className="muted">{s.b}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="wrap pb-6 grid md:grid-cols-2 gap-4">
        <div className="rounded-[var(--radius-panel)] bg-[var(--color-teal-900)] text-white p-8 grid gap-3 content-start">
          <h2 className="text-white">{t.home.partnerTitle}</h2>
          <p className="text-[var(--color-teal-100)]">{t.home.partnerBody}</p>
          <div>{BRAND.urls.partner ? <a href={BRAND.urls.partner} className="btn btn-light">{t.home.partnerCta}</a> : <p className="text-[var(--color-teal-100)] text-sm">Partner applications will open when the partner portal is connected.</p>}</div>
        </div>
        <div className="panel p-8 grid gap-3 content-start">
          <h2>{t.home.installTitle}</h2>
          <p className="muted">{t.home.installBody}</p>
          <div className="[&_.btn-light]:bg-[var(--color-teal-800)] [&_.btn-light]:text-white"><InstallButton /></div>
        </div>
      </section>
    </>
  );
}
