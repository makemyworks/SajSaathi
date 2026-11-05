import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Clock, Home, MapPin, ShieldAlert, Store } from "lucide-react";
import { loadProvider } from "@/lib/provider-page";
import { currentUser, dict, locale } from "@/lib/session";
import { fmt, pick } from "@/lib/shared/i18n";
import { inr, dateOnly } from "@/lib/shared/format";
import { Stars } from "@/lib/shared/ui";
import { BRAND } from "@/lib/shared/brand";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FavouriteButton } from "@/components/FavouriteButton";

export const dynamic = "force-dynamic";
type P = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const p = await loadProvider((await params).slug);
  const where = [p.locality, p.city].filter(Boolean).join(", ");
  return { title: `${p.name}${where ? `, ${where}` : ""}`, description: (p.about ?? `${p.name} on Saj Saathi — see prices and free times and book online.`).slice(0, 155), alternates: { canonical: `/p/${p.slug}` }, openGraph: { images: p.gallery[0] ? [p.gallery[0].url] : undefined } };
}

export default async function ProviderPage({ params }: { params: P }) {
  const { slug } = await params;
  const [p, t, lang, user] = await Promise.all([loadProvider(slug), dict(), locale(), currentUser()]);
  const days = t.provider.days;
  const order = ["1", "2", "3", "4", "5", "6", "0"] as const;
  const notices = p.categories.filter((c) => c.safetyNotice);
  const policy = p.categories[0]?.cancellationPolicy;
  const ld = {
    "@context": "https://schema.org", "@type": "HealthAndBeautyBusiness", name: p.name, url: `${BRAND.urls.customer}/p/${p.slug}`,
    address: p.address.city ? { "@type": "PostalAddress", streetAddress: "line1" in p.address ? p.address.line1 : undefined, addressLocality: p.address.locality ?? p.address.city, addressRegion: "state" in p.address ? p.address.state : undefined, postalCode: "pin" in p.address ? p.address.pin : undefined, addressCountry: "IN" } : undefined,
    image: p.gallery.map((g) => `${BRAND.urls.customer}${g.url}`).slice(0, 5),
    ...(p.ratingCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.ratingAvg, reviewCount: p.ratingCount } } : {}),
    makesOffer: p.services.slice(0, 20).map((s) => ({ "@type": "Offer", name: s.name, price: (s.pricePaise / 100).toFixed(2), priceCurrency: "INR" })),
  };

  return (
    <div className="wrap py-8 grid gap-8">
      <Breadcrumbs items={[{ href: "/", label: "Saj Saathi" }, ...(p.city ? [{ href: `/cities/${encodeURIComponent(p.city.toLowerCase())}`, label: p.city }] : []), { href: `/p/${p.slug}`, label: p.name }]} />
      <header className="grid gap-3">
        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="mr-auto">{p.name}</h1>
          <FavouriteButton providerId={p.id} initial={!!user?.favourites?.includes(p.id)} loggedIn={!!user} label={t.account.favourites} />
          <Link href={`/book/${p.slug}`} className="btn btn-primary">{t.provider.bookNow}</Link>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {p.verified && <span className="badge badge-teal"><BadgeCheck aria-hidden size={14} />{t.search.verified}{p.verifiedAt ? ` · ${dateOnly(p.verifiedAt, lang)}` : ""}</span>}
          {p.ratingCount > 0 ? <Stars value={p.ratingAvg} count={p.ratingCount} label={fmt(t.search.reviews, { n: p.ratingCount })} /> : <span className="badge">{t.search.newProvider}</span>}
          <span className="inline-flex items-center gap-1 muted"><MapPin aria-hidden size={16} />{[p.address.locality, p.address.city].filter(Boolean).join(", ")}</span>
          {p.inStore && <span className="inline-flex items-center gap-1 muted"><Store aria-hidden size={16} />{t.search.inStore}</span>}
          {p.atHome && <span className="inline-flex items-center gap-1 muted"><Home aria-hidden size={16} />{t.search.atHome}{p.travelFeePaise ? ` (+${inr(p.travelFeePaise, lang)})` : ""}</span>}
        </div>
        {notices.map((c) => <p key={c.id} className="inline-flex items-center gap-2 text-[var(--color-gold-ink)] font-medium"><ShieldAlert aria-hidden size={18} />{pick(c.safetyNotice, lang)}</p>)}
      </header>

      {p.gallery.length > 0 && (
        <section aria-labelledby="gal" className="grid gap-3">
          <h2 id="gal" className="sr-only">{t.provider.gallery}</h2>
          <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {p.gallery.slice(0, 4).map((g, i) => <li key={g.url} className={i === 0 ? "col-span-3 sm:col-span-2 sm:row-span-2" : ""}><img src={g.url} alt={g.caption ?? `${p.name} photo ${i + 1}`} loading={i ? "lazy" : "eager"} className="w-full h-full aspect-square object-cover rounded-xl" /></li>)}
          </ul>
          {p.gallery.length > 4 && <Link href={`/p/${p.slug}/gallery`} className="font-semibold underline underline-offset-4">{t.provider.gallery} ({p.gallery.length})</Link>}
        </section>
      )}

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 items-start">
        <div className="grid gap-8">
          <section aria-labelledby="svc" className="grid gap-3">
            <div className="flex items-end justify-between gap-3 flex-wrap"><h2 id="svc">{t.provider.services}</h2><span className="flex gap-4"><Link className="underline underline-offset-4" href={`/p/${p.slug}/prices`}>₹</Link><Link className="underline underline-offset-4" href={`/p/${p.slug}/availability`}>{t.booking.chooseTime}</Link></span></div>
            <ul className="panel divide-y divide-[var(--color-line)]">
              {p.services.map((s) => (
                <li key={s.id} className="p-4 sm:p-5 grid sm:grid-cols-[1fr_auto] gap-3">
                  <div className="grid gap-1">
                    <Link href={`/p/${p.slug}/services/${s.id}`} className="font-semibold text-lg hover:underline underline-offset-4">{s.name}</Link>
                    {s.description && <p className="muted line-clamp-2">{s.description}</p>}
                    <p className="text-[0.95rem] muted inline-flex items-center gap-3 flex-wrap"><span className="inline-flex items-center gap-1"><Clock aria-hidden size={15} />{fmt(t.provider.minutes, { n: s.durationMin })}</span>{s.mode !== "in_store" && <span>{t.search.atHome}</span>}{s.eligibility && <span>{s.eligibility}</span>}</p>
                    {s.addOns.length > 0 && <p className="text-[0.95rem]">{t.provider.addOns}: {s.addOns.map((a) => `${a.name} +${inr(a.pricePaise, lang)}`).join(", ")}</p>}
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                    <strong className="text-lg tabular-nums">{inr(s.pricePaise, lang)}</strong>
                    <Link href={`/book/${p.slug}?service=${s.id}`} className="btn btn-sm btn-outline">{t.provider.book}</Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {p.about && <section aria-labelledby="about" className="grid gap-2"><h2 id="about">{t.provider.about}</h2><p className="whitespace-pre-line max-w-[70ch]">{p.about}</p></section>}

          <section aria-labelledby="rev" className="grid gap-3">
            <h2 id="rev">{t.provider.reviews}</h2>
            {p.reviews.length === 0 ? <p className="muted">{t.provider.noReviews}</p> : (
              <ul className="grid gap-4">
                {p.reviews.map((r) => (
                  <li key={r.id} className="border-b border-[var(--color-line)] pb-4 grid gap-1">
                    <div className="flex items-center gap-3"><Stars value={r.rating} count={1} /><span className="font-semibold">{r.name}</span><span className="muted text-sm">{dateOnly(r.at, lang)}</span></div>
                    {r.text && <p className="max-w-[70ch]">{r.text}</p>}
                    {r.reply && <p className="pl-4 border-l-2 border-[var(--color-gold)] text-[0.95rem]"><span className="font-semibold">{t.provider.reply}: </span>{r.reply.text}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="grid gap-6">
          <section aria-labelledby="hrs" className="panel p-5 grid gap-2">
            <h2 id="hrs" className="text-lg">{t.provider.hours}</h2>
            <table className="w-full text-[0.95rem]"><tbody>
              {order.map((d) => { const h = p.hours[d]; return (
                <tr key={d} className="border-b border-[var(--color-line)] last:border-0"><th scope="row" className="text-left font-medium py-1.5">{days[Number(d)]}</th><td className="text-right tabular-nums">{h?.open ? h.slots.map((s) => `${s.start}–${s.end}`).join(", ") : <span className="muted">{t.provider.closed}</span>}</td></tr>
              ); })}
            </tbody></table>
            {p.holidays.length > 0 && <p className="text-sm muted">{t.provider.closed}: {p.holidays.slice(0, 6).map((d) => dateOnly(d, lang)).join(", ")}</p>}
          </section>
          {p.staff.length > 0 && <section className="panel p-5 grid gap-2"><h2 className="text-lg">{t.provider.team}</h2><ul className="grid gap-1">{p.staff.map((s) => <li key={s.id}><span className="font-medium">{s.name}</span> <span className="muted">· {s.role}</span></li>)}</ul></section>}
          {p.atHome && p.serviceAreaPins.length > 0 && <section className="panel p-5 grid gap-2"><h2 className="text-lg">{t.provider.serviceArea}</h2><p className="tabular-nums text-[0.95rem] break-words">{p.serviceAreaPins.join(", ")}</p></section>}
          {p.credentialsOnFile.length > 0 && <section className="panel p-5 grid gap-2"><h2 className="text-lg">{t.provider.credentials}</h2><ul className="list-disc pl-5">{p.credentialsOnFile.map((c) => <li key={c.en}>{pick(c, lang)}</li>)}</ul></section>}
          {policy && <section className="panel p-5 grid gap-2"><h2 className="text-lg">{t.provider.cancellation}</h2><p>{fmt(t.provider.freeUntil, { h: policy.freeUntilHours })}</p>{policy.lateFeePercent > 0 && <p>{fmt(t.provider.lateFee, { p: policy.lateFeePercent })}</p>}</section>}
          <Link href={`/help?provider=${p.slug}`} className="muted underline underline-offset-4 text-[0.95rem]">{t.provider.report}</Link>
        </aside>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
    </div>
  );
}
