import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, CheckCircle2, Clock,
  HeartHandshake, Home, IndianRupee, LifeBuoy, MapPin,
  MessageSquareQuote, ShieldCheck, Sparkles, Store,
} from "lucide-react";
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
export const metadata: Metadata = {
  title: "Beauty, grooming & wellness services near you",
  description: "Discover salons and independent beauty and wellness professionals. Compare services, see prices and book with Saj Saathi.",
};

type Promotion = { _id: string; title: string; body?: string; couponCode?: string; validTo?: Date };

export default async function HomePage() {
  const [t, lang] = await Promise.all([dict(), locale()]);
  const city = (await cookies()).get("ss_city")?.value;
  type SearchResult = Awaited<ReturnType<typeof searchProviders>>;
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
    if (dbCategories.length === 0) {
      marketplaceReady = false;
      categories = seedCategoriesForPreview();
    }
  } catch (error) {
    marketplaceReady = false;
    console.error("[Saj Saathi] Customer homepage data could not be loaded:", error);
    categories = seedCategoriesForPreview();
  }

  const copy = lang === "hi" ? {
    eyebrow: "ब्यूटी  ·  ग्रूमिंग  ·  वेलनेस",
    headlineA: "आपका समय।", headlineB: "आपकी देखभाल।",
    intro: "अपने आसपास सैलून और ब्यूटी प्रोफेशनल खोजें। सेवाएं और कीमतें देखें, अपनी सुविधा का समय चुनें और आसानी से बुक करें।",
    searchTitle: "अपनी अगली सेवा खोजें",
    explore: "सभी सेवाएं देखें", browse: "प्रदाता खोजें", homeCare: "घर पर सेवा", salonVisit: "सैलून विज़िट",
    categoriesKicker: "अपनी पसंद चुनें", categoriesSub: "रोज़मर्रा की ग्रूमिंग से खास मौकों तक — अपनी ज़रूरत की सेवा खोजें।",
    allServices: "सभी सेवाएं", discoverKicker: "आपके लिए चुने गए", nearbySub: "अपने शहर में उपलब्ध प्रोफेशनल और सैलून देखें।",
    seeProviders: "सभी प्रदाता देखें", atHomeKicker: "आपकी सुविधा, आपका घर", atHomeTitle: "जब चाहें, घर पर देखभाल।",
    atHomeBody: "घर पर सेवा देने वाले प्रदाताओं को खोजें। उपलब्धता और आने-जाने का शुल्क बुकिंग से पहले देखें।",
    exploreHome: "घर पर सेवा खोजें", offersKicker: "खास आपके लिए", offersTitle: "ऑफर और खास पैकेज", allOffers: "सभी ऑफर देखें",
    trustKicker: "भरोसे के साथ बुक करें", trustTitle: "अच्छी सेवा की शुरुआत सही जानकारी से।",
    trustSub: "सही प्रदाता चुनने और आत्मविश्वास से बुक करने के लिए ज़रूरी जानकारी एक जगह।",
    howKicker: "बस कुछ आसान कदम", howTitle: "बुकिंग करना इतना आसान है।", howSub: "अपनी पसंद की सेवा से लेकर कन्फर्म अपॉइंटमेंट तक — सब कुछ साफ़ और सरल।",
    partnerKicker: "सैलून और ब्यूटी प्रोफेशनल के लिए", partnerTitle: "अपने काम को आगे बढ़ाएं।",
    partnerBody: "Saj Saathi के साथ ऑनलाइन बुकिंग पाएं, अपॉइंटमेंट और स्टाफ संभालें और अपने बिज़नेस को नए ग्राहकों तक पहुंचाएं।",
    partnerJoin: "पार्टनर बनें", professionalJoin: "प्रोफेशनल के रूप में जुड़ें", partnerLogin: "पार्टनर लॉग इन",
    installKicker: "आपकी जेब में Saj Saathi", installTitle: "अगली बुकिंग और भी आसान बनाएं।",
    installBody: "Saj Saathi को अपने फोन की होम स्क्रीन पर जोड़ें और अपनी सुविधा से खोलें।",
    helpTitle: "मदद चाहिए? हम यहाँ हैं।", helpBody: "बुकिंग, भुगतान या अकाउंट से जुड़े सवालों के लिए सहायता केंद्र देखें।",
    support: "सहायता केंद्र", faq: "आम सवाल", contact: "संपर्क करें", login: "लॉग इन", signup: "अकाउंट बनाएं",
    preview: "Saj Saathi अपना लाइव मार्केटप्लेस तैयार कर रहा है।",
    previewBody: "अभी आप सेवा श्रेणियां देख सकते हैं। लाइव प्रदाता और बुकिंग उपलब्ध होने पर यहाँ दिखाई देंगे।",
    noProviders: "इस इलाके में अभी कोई सत्यापित प्रदाता सूचीबद्ध नहीं है। दूसरे इलाके से खोजें या हमें अपना क्षेत्र बताएं।",
    noAtHome: "इस समय घर पर सेवा देने वाले प्रदाता सूचीबद्ध नहीं हैं। उपलब्धता बदलने पर यहाँ दिखाई देंगे।",
  } : {
    eyebrow: "BEAUTY  ·  GROOMING  ·  WELLNESS",
    headlineA: "Your time.", headlineB: "Your kind of care.",
    intro: "Discover salons and independent beauty professionals around you. Explore services, compare clear prices and book a time that works for you.",
    searchTitle: "Find your next feel-good moment",
    explore: "Explore services", browse: "Find a provider", homeCare: "At-home services", salonVisit: "Salon visits",
    categoriesKicker: "A little something for you", categoriesSub: "From everyday grooming to special occasions, find the service that fits your day.",
    allServices: "View all services", discoverKicker: "Good care, close by", nearbySub: "Explore salons and professionals available in your selected city or area.",
    seeProviders: "Browse all providers", atHomeKicker: "Care, on your terms", atHomeTitle: "Your next appointment, at home.",
    atHomeBody: "Explore providers who offer at-home visits. Check availability and any travel charge before you confirm a booking.",
    exploreHome: "Explore at-home services", offersKicker: "A little extra goodness", offersTitle: "Offers worth a look", allOffers: "Explore all offers",
    trustKicker: "Feel good about your choice", trustTitle: "Good care starts with clear information.",
    trustSub: "The details you need to choose a provider and book with confidence, all in one place.",
    howKicker: "Four simple steps", howTitle: "A better way to book care.", howSub: "From finding the right service to a confirmed appointment, keep every step simple.",
    partnerKicker: "For salons & beauty professionals", partnerTitle: "Make more room to grow.",
    partnerBody: "Bring your services online with Saj Saathi. Manage appointments, keep your team organised and help new customers discover your business.",
    partnerJoin: "Become a partner", professionalJoin: "Join as a professional", partnerLogin: "Partner login",
    installKicker: "Saj Saathi, in your pocket", installTitle: "Make your next booking even easier.",
    installBody: "Add Saj Saathi to your phone's home screen and open it whenever you need a little care.",
    helpTitle: "Need a hand? We're here.", helpBody: "Visit our help centre for questions about bookings, payments or your account.",
    support: "Visit help centre", faq: "Frequently asked questions", contact: "Contact us", login: "Log in", signup: "Create account",
    preview: "Saj Saathi is getting its live marketplace ready.",
    previewBody: "You can explore the service categories for now. Live providers and bookings will appear here when available.",
    noProviders: "There are no verified providers listed in this area yet. Try another location or tell us which area you would like us to serve.",
    noAtHome: "There are no at-home providers listed right now. Available options will appear here when ready.",
  };

  const trustIcons = [ShieldCheck, IndianRupee, HeartHandshake, LifeBuoy];
  const partnerSignupUrl = BRAND.urls.partner ? `${BRAND.urls.partner}/signup` : "/partner";
  const partnerLoginUrl = BRAND.urls.partner ? `${BRAND.urls.partner}/login` : "/partner";

  return (
    <div className="ss-home">
      {!marketplaceReady && (
        <div className="ss-marketplace-notice wrap" role="status" aria-live="polite">
          <span className="ss-notice-icon"><Clock size={18} /></span>
          <div><strong>{copy.preview}</strong><p>{copy.previewBody}</p></div>
        </div>
      )}

      <section className="ss-hero" aria-labelledby="ss-home-title">
        <div className="ss-hero-orb ss-hero-orb-one" aria-hidden="true" />
        <div className="ss-hero-orb ss-hero-orb-two" aria-hidden="true" />
        <div className="wrap ss-hero-grid">
          <div className="ss-hero-copy">
            <span className="ss-eyebrow"><Sparkles size={15} /> {copy.eyebrow}</span>
            <h1 id="ss-home-title">{copy.headlineA}<br /><span>{copy.headlineB}</span></h1>
            <p className="ss-hero-intro">{copy.intro}</p>

            <div className="ss-search-wrap">
              <div className="ss-search-heading"><span className="ss-search-heading-icon"><Sparkles size={19} /></span><strong>{copy.searchTitle}</strong></div>
              <HeroSearch categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} cities={cities.map((c) => c.city)} />
            </div>

            <div className="ss-hero-actions">
              <Link href="/services" className="ss-text-link">{copy.explore}<ArrowUpRight size={17} /></Link>
              <Link href="/how-it-works" className="ss-text-link ss-text-link-muted">{t.nav.howItWorks}<ArrowRight size={16} /></Link>
            </div>
            <div className="ss-hero-assurance">
              <span><BadgeCheck size={16} /> {lang === "hi" ? "जांचे गए प्रदाता" : "Reviewed providers"}</span>
              <span><IndianRupee size={16} /> {lang === "hi" ? "पहले से कीमतें" : "Clear prices upfront"}</span>
              <span><Clock size={16} /> {lang === "hi" ? "सुविधा का समय" : "Your time, your choice"}</span>
            </div>
          </div>

          <div className="ss-hero-art-wrap">
            <div className="ss-hero-art-backdrop" aria-hidden="true" />
            <Image src="/images/home/beauty-care-illustration.svg" alt="Illustration celebrating beauty, self-care and wellness" width={760} height={690} priority className="ss-hero-art" unoptimized />
            <div className="ss-art-note ss-art-note-top"><span className="ss-art-note-icon"><Sparkles size={17} /></span><span><strong>{lang === "hi" ? "आपके लिए थोड़ा समय" : "A moment for you"}</strong><small>{lang === "hi" ? "आपकी पसंद, आपकी सुविधा" : "Your choice, your pace"}</small></span></div>
            <div className="ss-art-note ss-art-note-bottom"><span className="ss-art-note-icon ss-art-note-icon-green"><CheckCircle2 size={17} /></span><span><strong>{lang === "hi" ? "बुकिंग से पहले पूरी जानकारी" : "Know before you book"}</strong><small>{lang === "hi" ? "सेवा · समय · कीमत" : "Service · time · price"}</small></span></div>
          </div>
        </div>
      </section>

      <section className="wrap ss-quick-discovery" aria-label="Explore Saj Saathi">
        <Link href="/providers?mode=in_store" className="ss-discovery-tile"><span className="ss-discovery-icon ss-discovery-rose"><Store size={21} /></span><span><strong>{copy.salonVisit}</strong><small>{lang === "hi" ? "अपने पास सैलून खोजें" : "Discover salons around you"}</small></span><ArrowUpRight size={18} /></Link>
        <Link href="/providers?mode=at_home" className="ss-discovery-tile"><span className="ss-discovery-icon ss-discovery-lilac"><Home size={21} /></span><span><strong>{copy.homeCare}</strong><small>{lang === "hi" ? "घर पर सेवा देने वाले प्रदाता" : "Care that comes to you"}</small></span><ArrowUpRight size={18} /></Link>
        <Link href="/offers" className="ss-discovery-tile"><span className="ss-discovery-icon ss-discovery-gold"><Sparkles size={21} /></span><span><strong>{lang === "hi" ? "ऑफर और पैकेज" : "Offers & packages"}</strong><small>{lang === "hi" ? "उपलब्ध ऑफर देखें" : "See currently available offers"}</small></span><ArrowUpRight size={18} /></Link>
      </section>

      <section className="wrap ss-section ss-category-section" aria-labelledby="ss-categories-title">
        <div className="ss-section-heading">
          <div><span className="ss-kicker">{copy.categoriesKicker}</span><h2 id="ss-categories-title">{t.home.categoriesTitle}</h2><p>{copy.categoriesSub}</p></div>
          <Link href="/services" className="ss-outline-link">{copy.allServices}<ArrowRight size={17} /></Link>
        </div>
        <div className="ss-category-grid">
          {categories.slice(0, 8).map((c, index) => {
            const item = (
              <>
                <span className={`ss-category-icon ss-category-icon-${index % 5}`}><CategoryIcon name={c.icon} size={25} /></span>
                <span className="ss-category-copy"><strong>{pick(c.name, lang)}</strong><small>{pick(c.description, lang)}</small></span>
                <ArrowUpRight className="ss-category-arrow" size={18} />
              </>
            );
            return <div key={c.id} className="ss-category-card">{marketplaceReady ? <Link href={`/services/${c.slug}`} aria-label={`${pick(c.name, lang)} — ${copy.explore}`}>{item}</Link> : <div>{item}</div>}</div>;
          })}
        </div>
      </section>

      <section className="ss-nearby-section" aria-labelledby="ss-nearby-title">
        <div className="wrap ss-section">
          <div className="ss-section-heading">
            <div><span className="ss-kicker">{copy.discoverKicker}</span><h2 id="ss-nearby-title">{city ? `${t.home.nearbyTitle} · ${city}` : t.home.nearbyTitle}</h2><p>{copy.nearbySub}</p></div>
            <Link href="/providers" className="ss-outline-link">{copy.seeProviders}<ArrowRight size={17} /></Link>
          </div>
          {nearby.total > 0 ? (
            <ul className="ss-provider-list">{nearby.providers.slice(0, 4).map((p) => <ProviderRow key={p.id} p={p} t={t} locale={lang} />)}</ul>
          ) : (
            <div className="ss-empty-provider"><span className="ss-empty-icon"><MapPin size={25} /></span><div><strong>{marketplaceReady ? t.home.nearbyEmpty : copy.preview}</strong><p>{marketplaceReady ? copy.noProviders : copy.previewBody}</p><div className="ss-empty-actions">{marketplaceReady ? <Link href="/contact?topic=area" className="ss-small-button">{t.home.nearbyEmptyCta}<ArrowRight size={16} /></Link> : <Link href="/services" className="ss-small-button">{copy.allServices}<ArrowRight size={16} /></Link>}<Link href="/providers" className="ss-inline-secondary">{copy.browse}</Link></div></div></div>
          )}
        </div>
      </section>

      <section className="wrap ss-at-home-section" aria-labelledby="ss-at-home-title">
        <div className="ss-at-home-copy"><span className="ss-kicker ss-kicker-light">{copy.atHomeKicker}</span><h2 id="ss-at-home-title">{copy.atHomeTitle}</h2><p>{copy.atHomeBody}</p><Link href="/providers?mode=at_home" className="ss-light-button">{copy.exploreHome}<ArrowRight size={18} /></Link></div>
        <div className="ss-at-home-content">
          <div className="ss-at-home-icon"><Home size={30} /></div>
          {atHome.total > 0 ? <ul className="ss-at-home-provider-list">{atHome.providers.slice(0, 2).map((p) => <ProviderRow key={p.id} p={p} t={t} locale={lang} />)}</ul> : <div className="ss-at-home-empty"><strong>{marketplaceReady ? (lang === "hi" ? "घर पर सेवा की उपलब्धता देखें" : "Check at-home availability") : copy.preview}</strong><p>{marketplaceReady ? copy.noAtHome : copy.previewBody}</p></div>}
        </div>
      </section>

      {livePromos.length > 0 && (
        <section className="wrap ss-section ss-offers-section" aria-labelledby="ss-offers-title">
          <div className="ss-section-heading"><div><span className="ss-kicker">{copy.offersKicker}</span><h2 id="ss-offers-title">{copy.offersTitle}</h2></div><Link href="/offers" className="ss-outline-link">{copy.allOffers}<ArrowRight size={17} /></Link></div>
          <div className="ss-offer-grid">{livePromos.map((p) => (
            <article key={p._id} className="ss-offer-card"><span className="ss-offer-spark"><Sparkles size={18} /></span><div><span className="ss-offer-label">{lang === "hi" ? "सीमित ऑफर" : "SAJ SAATHI OFFER"}</span><h3>{p.title}</h3>{p.body && <p>{p.body}</p>}{p.couponCode && <div className="ss-coupon"><span>{lang === "hi" ? "कूपन कोड" : "COUPON CODE"}</span><strong>{p.couponCode}</strong></div>}</div><Link href="/offers" className="ss-offer-link" aria-label={`${copy.allOffers}: ${p.title}`}><ArrowUpRight size={19} /></Link>
            </article>
          ))}</div>
        </section>
      )}

      <section className="wrap ss-section ss-trust-section" aria-labelledby="ss-trust-title">
        <div className="ss-section-heading ss-section-heading-centered"><div><span className="ss-kicker">{copy.trustKicker}</span><h2 id="ss-trust-title">{copy.trustTitle}</h2><p>{copy.trustSub}</p></div></div>
        <dl className="ss-trust-grid">{t.home.trust.map((x, i) => { const Icon = trustIcons[i] ?? ShieldCheck; return <div className="ss-trust-card" key={x.t}><dt><span><Icon size={22} /></span>{x.t}</dt><dd>{x.b}</dd></div>; })}</dl>
      </section>

      <section className="ss-how-section" aria-labelledby="ss-how-title">
        <div className="wrap ss-section"><div className="ss-section-heading ss-section-heading-centered"><div><span className="ss-kicker">{copy.howKicker}</span><h2 id="ss-how-title">{copy.howTitle}</h2><p>{copy.howSub}</p></div></div>
          <ol className="ss-steps-grid">{t.home.steps.map((s, i) => <li className="ss-step-card" key={s.t}><span className="ss-step-number">0{i + 1}</span><span className="ss-step-icon">{i === 0 ? <Sparkles size={23} /> : i === 1 ? <BadgeCheck size={23} /> : i === 2 ? <Clock size={23} /> : <CheckCircle2 size={23} />}</span><strong>{s.t}</strong><p>{s.b}</p></li>)}</ol>
          <div className="ss-how-cta"><Link href="/how-it-works" className="ss-outline-link">{t.nav.howItWorks}<ArrowRight size={17} /></Link></div>
        </div>
      </section>

      <section className="wrap ss-section ss-join-grid" aria-label="Join Saj Saathi">
        <article className="ss-join-card ss-join-partner"><div className="ss-join-art"><Store size={28} /></div><span className="ss-kicker ss-kicker-light">{copy.partnerKicker}</span><h2>{copy.partnerTitle}</h2><p>{copy.partnerBody}</p><div className="ss-join-actions"><a href={partnerSignupUrl} className="ss-light-button">{copy.partnerJoin}<ArrowRight size={17} /></a><Link href="/professional" className="ss-join-login">{copy.professionalJoin}</Link>{BRAND.urls.partner && <a href={partnerLoginUrl} className="ss-join-login">{copy.partnerLogin}</a>}</div></article>
        <article className="ss-join-card ss-join-install"><div className="ss-join-art ss-join-art-rose"><IndianRupee size={28} /></div><span className="ss-kicker">{copy.installKicker}</span><h2>{copy.installTitle}</h2><p>{copy.installBody}</p><div className="ss-install-action"><InstallButton /></div><div className="ss-join-links"><Link href="/login">{copy.login}</Link><span>·</span><Link href="/signup">{copy.signup}</Link><span>·</span><Link href="/account/bookings">{t.nav.bookings}</Link></div></article>
      </section>

      <section className="wrap ss-help-strip" aria-label="Customer help">
        <div className="ss-help-icon"><MessageSquareQuote size={23} /></div><div className="ss-help-copy"><strong>{copy.helpTitle}</strong><p>{copy.helpBody}</p></div><div className="ss-help-links"><Link href="/help">{copy.support}</Link><Link href="/faq">{copy.faq}</Link><Link href="/contact">{copy.contact}</Link><Link href="/cities">{lang === "hi" ? "शहर देखें" : "Browse cities"}</Link><Link href="/account/bookings">{t.nav.bookings}</Link><Link href="/account/favourites">{lang === "hi" ? "पसंदीदा" : "Favourites"}</Link><Link href="/account/memberships">{lang === "hi" ? "मेरी सदस्यताएं" : "Memberships"}</Link><Link href="/account/profile">{lang === "hi" ? "प्रोफ़ाइल" : "My profile"}</Link></div>
      </section>
    </div>
  );
}

function seedCategoriesForPreview() {
  return seedCategories(new Date()).map((category, index) =>
    publicCategory({ _id: `preview-${index}`, ...category } as Category),
  );
}
