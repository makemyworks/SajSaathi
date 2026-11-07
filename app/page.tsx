"use client";

import Link from "next/link";
import {
  ArrowUpRight, Ban, Bell, CalendarClock, CheckCircle2, Clock3,
  Plus, Scissors, Star, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { useData } from "@/lib/client";
import { inr } from "@/lib/shared/format";
import { Empty, Spinner } from "@/lib/shared/ui";
import { usePartner } from "@/components/Partner";
import { BookingCard, type BookingRow } from "@/components/BookingCard";

type Dash = {
  provider: { name: string; status: string; ratingAvg: number; ratingCount: number };
  today: BookingRow[];
  counts: { today: number; pending: number; upcoming: number; completedMonth: number; cancelledMonth: number };
  revenueMonthPaise: number;
  commissionMonthPaise: number;
  unreadNotifications: number;
};

function StatCard({ label, value, href, Icon, tone = "default" }: {
  label: string;
  value: string | number;
  href: string;
  Icon: LucideIcon;
  tone?: "default" | "warm";
}) {
  return <Link href={href} className={`partner-stat-card ${tone === "warm" ? "is-warm" : ""}`}>
    <span className="partner-stat-icon"><Icon size={19} aria-hidden /></span>
    <span className="partner-stat-value">{value}</span>
    <span className="partner-stat-label">{label}</span>
    <ArrowUpRight className="partner-stat-arrow" size={16} aria-hidden />
  </Link>;
}

export default function Dashboard() {
  const { t, locale, app, appLoading, appError, reloadApp, has } = usePartner();
  const hasApp = !!app?.application;
  const { data, loading, error, reload } = useData<Dash>(hasApp ? "partner/dashboard" : null);
  const isHindi = locale === "hi";

  if (appLoading && !app) return <div className="panel p-6"><Spinner label={t.common.loading} /></div>;
  if (appError && !app) return <section className="partner-onboarding-hero"><span className="partner-kicker">SAJ SAATHI PARTNER</span><h1>{isHindi ? "आपका पार्टनर वर्कस्पेस" : "Your partner workspace"}</h1><p>{appError}</p><a className="btn btn-primary" href="/api/health" target="_blank" rel="noreferrer">{isHindi ? "कनेक्शन जाँचें" : "Check connection"}</a><button className="btn btn-outline" onClick={reloadApp}>{isHindi ? "फिर प्रयास करें" : "Try again"}</button></section>;

  if (app && !hasApp) return <section className="partner-onboarding-hero">
    <span className="partner-kicker">SAJ SAATHI PARTNER NETWORK</span>
    <h1>{isHindi ? "आपका काम, अब और आसान।" : "Your business, made easier."}</h1>
    <p>{isHindi ? "ग्राहकों से जुड़ें, सेवाएँ जोड़ें और अपना पार्टनर आवेदन पूरा करें।" : "Connect with customers, add your services and complete your Partner application to get started."}</p>
    <div className="partner-onboarding-points"><span><CheckCircle2 size={17} /> {isHindi ? "एक जगह बिज़नेस जानकारी" : "One place for business details"}</span><span><CalendarClock size={17} /> {isHindi ? "बुकिंग और समय प्रबंधन" : "Bookings and schedule management"}</span><span><Wallet size={17} /> {isHindi ? "कमाई का रिकॉर्ड" : "Earnings records"}</span></div>
    <Link className="btn btn-primary btn-xl" href="/application">{t.apply.start} <ArrowUpRight size={18} /></Link>
  </section>;

  if (!data && loading) return <div className="grid gap-4"><div className="partner-dashboard-skeleton" /><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1, 2, 3, 4].map((x) => <div key={x} className="partner-stat-skeleton" />)}</div><Spinner label={t.common.loading} /></div>;
  if (!data) return <section className="partner-empty-error"><div className="partner-empty-icon"><CalendarClock size={25} /></div><h1>{isHindi ? "डैशबोर्ड लोड नहीं हो पाया" : "Your dashboard could not load"}</h1><p>{error || t.common.error}</p><div className="flex flex-wrap gap-2 justify-center"><button type="button" className="btn btn-primary" onClick={reload}>{isHindi ? "फिर प्रयास करें" : "Try again"}</button><a className="btn btn-outline" href="/api/health" target="_blank" rel="noreferrer">{isHindi ? "कनेक्शन जाँचें" : "Check connection"}</a></div></section>;

  const statCards = [
    { label: t.home.pending, value: data.counts.pending, href: "/bookings?tab=pending", Icon: Clock3 },
    { label: t.home.upcoming, value: data.counts.upcoming, href: "/bookings?tab=upcoming", Icon: CalendarClock },
    { label: t.home.completedMonth, value: data.counts.completedMonth, href: "/bookings?tab=completed", Icon: CheckCircle2 },
    { label: t.home.cancelledMonth, value: data.counts.cancelledMonth, href: "/bookings?tab=cancelled", Icon: Ban },
  ];

  return (
    <div className="partner-dashboard">
      <section className="partner-dashboard-hero">
        <div className="partner-dashboard-hero-copy">
          <span className="partner-kicker">{isHindi ? "आपका बिज़नेस डैशबोर्ड" : "YOUR BUSINESS AT A GLANCE"}</span>
          <h1>{t.home.greeting}, {data.provider.name}</h1>
          <p>{isHindi ? "आज की बुकिंग और अपने बिज़नेस की गतिविधि यहाँ देखें।" : "Your bookings, services and business activity — organised in one place."}</p>
          {data.provider.status !== "approved" && <div className="partner-live-note"><span className="partner-live-dot" />{t.home.notLive} <Link href="/application">{t.nav.application}</Link></div>}
        </div>
        <div className="partner-dashboard-hero-art" aria-hidden="true"><div className="partner-art-ring" /><div className="partner-art-card"><Scissors size={25} /><span>SAJ<br />SAATHI</span></div><div className="partner-art-spark">✦</div></div>
      </section>

      <section className="partner-section-block">
        <div className="partner-section-heading"><div><span className="partner-kicker">{isHindi ? "आज की स्थिति" : "TODAY & THIS MONTH"}</span><h2>{isHindi ? "बिज़नेस की झलक" : "Business overview"}</h2></div><Link href="/bookings" className="partner-text-link">{t.home.seeAll} <ArrowUpRight size={15} /></Link></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{statCards.map((card) => <StatCard key={card.href} {...card} />)}</div>
      </section>

      <section className="grid lg:grid-cols-[1.25fr_.75fr] gap-4">
        <div className="partner-revenue-card">
          <div className="partner-revenue-top"><span>{t.home.revenue}</span><span className="partner-revenue-icon"><Wallet size={19} /></span></div>
          <strong>{inr(data.revenueMonthPaise, locale)}</strong>
          <p>{isHindi ? "इस महीने का रिकॉर्ड किया गया कुल बिज़नेस मूल्य" : "Recorded service value for the current month"}</p>
          <div className="partner-revenue-meta"><span>{t.home.commission}</span><b>{inr(data.commissionMonthPaise, locale)}</b><Link href="/money">{isHindi ? "विवरण देखें" : "View statement"} <ArrowUpRight size={14} /></Link></div>
        </div>
        <div className="partner-rating-card">
          <div className="partner-rating-card-icon"><Star size={20} /></div>
          <span className="partner-rating-label">{t.home.rating}</span>
          <strong>{data.provider.ratingCount ? data.provider.ratingAvg.toFixed(1) : "—"}<small>/ 5</small></strong>
          <p>{data.provider.ratingCount ? `${data.provider.ratingCount} ${isHindi ? "ग्राहक समीक्षाएँ" : "customer reviews"}` : (isHindi ? "बुकिंग पूरी होने पर समीक्षाएँ यहाँ दिखेंगी।" : "Reviews will appear here after completed bookings.")}</p>
          <Link href="/reviews">{isHindi ? "समीक्षाएँ देखें" : "View reviews"} <ArrowUpRight size={14} /></Link>
        </div>
      </section>

      <section className="partner-section-block">
        <div className="partner-section-heading"><div><span className="partner-kicker">{isHindi ? "तेज़ पहुँच" : "QUICK ACCESS"}</span><h2>{t.home.quick}</h2></div></div>
        <div className="partner-quick-grid">
          <Link href="/bookings/new" className="partner-quick-card"><span><Plus size={20} /></span><strong>{t.home.addWalkIn}</strong><small>{isHindi ? "फोन या दुकान पर आई बुकिंग जोड़ें" : "Add an in-person customer booking"}<ArrowUpRight size={14} /></small></Link>
          <Link href="/schedule#blocks" className="partner-quick-card"><span><Ban size={20} /></span><strong>{t.home.blockTime}</strong><small>{isHindi ? "व्यस्त समय या छुट्टी रोकें" : "Mark time as unavailable"}<ArrowUpRight size={14} /></small></Link>
          <Link href="/services" className="partner-quick-card"><span><Scissors size={20} /></span><strong>{t.nav.services}</strong><small>{isHindi ? "सेवाएँ और कीमतें अपडेट करें" : "Update services and prices"}<ArrowUpRight size={14} /></small></Link>
          {has("staff") && app?.application?.kind === "business" && <Link href="/staff" className="partner-quick-card"><span><Users size={20} /></span><strong>{t.nav.staff}</strong><small>{isHindi ? "टीम और सेवा असाइनमेंट देखें" : "Manage your team and assignments"}<ArrowUpRight size={14} /></small></Link>}
        </div>
      </section>

      <section className="partner-section-block">
        <div className="partner-section-heading"><div><span className="partner-kicker">{isHindi ? "अपॉइंटमेंट" : "APPOINTMENTS"}</span><h2>{t.home.today} <span className="partner-count-pill">{data.counts.today}</span></h2></div><Link className="partner-text-link" href="/bookings?tab=today">{t.home.seeAll} <ArrowUpRight size={15} /></Link></div>
        {data.today.length === 0 ? <Empty title={t.home.none} body={isHindi ? "नई बुकिंग आने पर वे यहाँ दिखाई देंगी।" : "New bookings will appear here when customers book your services."} action={<Link className="btn btn-outline btn-sm" href="/calendar">{isHindi ? "कैलेंडर देखें" : "Open calendar"}</Link>} /> : <ul className="grid gap-3">{data.today.map((booking) => <BookingCard key={booking._id} b={booking} onChange={reload} />)}</ul>}
      </section>

      {data.unreadNotifications > 0 && <Link href="/notifications" className="partner-notification-strip"><Bell size={18} /><span>{isHindi ? `${data.unreadNotifications} नई सूचनाएँ हैं` : `You have ${data.unreadNotifications} unread notifications`}</span><ArrowUpRight size={16} /></Link>}
    </div>
  );
}
