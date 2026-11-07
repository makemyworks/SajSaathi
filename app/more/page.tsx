"use client";

import Link from "next/link";
import {
  ArrowUpRight, Bell, Building2, Clock3, FileText, Image as ImageIcon,
  LifeBuoy, MapPin, QrCode, Settings, Star, Users, Wallet,
} from "lucide-react";
import { usePartner } from "@/components/Partner";

export default function MorePage() {
  const { t, has, app, locale } = usePartner();
  const isHindi = locale === "hi";
  const items = [
    { href: "/application", label: t.nav.application, desc: isHindi ? "अपने आवेदन की स्थिति और जानकारी" : "Application status and business details", Icon: FileText, show: true, group: "Business setup" },
    { href: "/staff", label: t.nav.staff, desc: isHindi ? "टीम और सेवा असाइनमेंट" : "Your team and service assignments", Icon: Users, show: has("staff") && app?.application?.kind === "business", group: "Business setup" },
    { href: "/schedule", label: t.nav.schedule, desc: isHindi ? "काम के घंटे, छुट्टियाँ और ब्लॉक समय" : "Working hours, holidays and blocked time", Icon: Clock3, show: true, group: "Business setup" },
    { href: "/branches", label: t.nav.branches, desc: isHindi ? "अपनी अलग-अलग शाखाएँ संभालें" : "Manage your business locations", Icon: Building2, show: has("branches") && app?.application?.kind === "business", group: "Business setup" },
    { href: "/application", label: t.nav.area, desc: isHindi ? "घर पर सेवा के लिए PIN कोड" : "PIN codes and travel settings for home visits", Icon: MapPin, show: has("atHome"), group: "Business setup" },
    { href: "/profile", label: t.nav.gallery, desc: isHindi ? "बिज़नेस फोटो और सार्वजनिक प्रोफ़ाइल" : "Business photos and public profile", Icon: ImageIcon, show: true, group: "Grow your business" },
    { href: "/reviews", label: t.nav.reviews, desc: isHindi ? "ग्राहकों की प्रतिक्रिया देखें" : "Read feedback from completed bookings", Icon: Star, show: true, group: "Grow your business" },
    { href: "/promote", label: t.nav.promote, desc: isHindi ? "बुकिंग QR कोड और पोस्टर" : "Booking QR codes and promotional posters", Icon: QrCode, show: true, group: "Grow your business" },
    { href: "/money", label: t.nav.money, desc: isHindi ? "कमाई, कमीशन और स्टेटमेंट" : "Earnings, commission and statements", Icon: Wallet, show: true, group: "Grow your business" },
    { href: "/notifications", label: t.nav.notifications, desc: isHindi ? "बुकिंग और सिस्टम अपडेट" : "Booking and platform updates", Icon: Bell, show: true, group: "Account & support" },
    { href: "/support", label: t.nav.support, desc: isHindi ? "मदद और सहायता अनुरोध" : "Get help with your Partner account", Icon: LifeBuoy, show: true, group: "Account & support" },
    { href: "/settings", label: t.nav.settings, desc: isHindi ? "भाषा, पासवर्ड और अकाउंट सेटिंग्स" : "Language, password and account settings", Icon: Settings, show: true, group: "Account & support" },
  ].filter((item) => item.show);
  const groups = ["Business setup", "Grow your business", "Account & support"];

  return (
    <div className="grid gap-6">
      <header className="partner-more-hero">
        <span className="partner-kicker">SAJ SAATHI PARTNER</span>
        <h1>{isHindi ? "अपने बिज़नेस को संभालें" : "Everything for your business"}</h1>
        <p>{isHindi ? "अपने रोज़ के काम, टीम, कमाई और अकाउंट को एक ही जगह से मैनेज करें।" : "Manage your day-to-day work, team, earnings and account from one simple place."}</p>
      </header>
      {groups.map((group) => {
        const rows = items.filter((item) => item.group === group);
        if (!rows.length) return null;
        return <section key={group} className="grid gap-3">
          <h2 className="partner-more-heading">{group}</h2>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {rows.map(({ href, label, desc, Icon }) => <Link href={href} key={`${href}-${label}`} className="partner-more-card">
              <span className="partner-more-icon"><Icon size={21} aria-hidden /></span>
              <span className="partner-more-copy"><strong>{label}</strong><small>{desc}</small></span>
              <ArrowUpRight className="partner-more-arrow" size={17} aria-hidden />
            </Link>)}
          </div>
        </section>;
      })}
      <section className="partner-more-support"><span className="partner-more-support-icon"><LifeBuoy size={22} /></span><div><strong>{isHindi ? "सहायता चाहिए?" : "Need a hand?"}</strong><p>{isHindi ? "हमारी सहायता टीम आपके पार्टनर अकाउंट और बुकिंग से जुड़े सवालों में मदद कर सकती है।" : "Our support team can help with your Partner account, bookings and setup questions."}</p></div><Link className="btn btn-outline btn-sm" href="/support">{isHindi ? "सहायता खोलें" : "Get support"} <ArrowUpRight size={15} /></Link></section>
    </div>
  );
}
