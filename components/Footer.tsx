import Link from "next/link";
import { ArrowUpRight, Instagram, Mail, Phone } from "lucide-react";
import { Logo } from "@/lib/shared/Logo";
import { BRAND } from "@/lib/shared/brand";
import { dict } from "@/lib/session";

export async function Footer() {
  const t = await dict();
  const cols = [
    { h: "Explore", links: [["/services", t.nav.services], ["/providers", t.nav.providers], ["/cities", t.footer.cities], ["/offers", t.footer.offers]] },
    { h: "Your account", links: [["/account/bookings", t.account.bookings], ["/account/favourites", t.account.favourites], ["/account/memberships", t.account.memberships], ["/referral", "Refer a friend"]] },
    { h: t.nav.help, links: [["/help", t.footer.help], ["/faq", t.footer.faq], ["/contact", t.footer.contact], ["/accessibility", t.footer.accessibility]] },
    { h: t.nav.forPartners, links: [["/partner", t.footer.partner], ["/professional", t.footer.professional], [BRAND.urls.partner || "/partner", "Partner portal"]] },
    { h: "Legal", links: [["/legal/privacy", t.footer.privacy], ["/legal/terms", t.footer.terms], ["/legal/refunds", t.footer.refunds]] },
  ];
  return (
    <footer className="customer-site-footer">
      <div className="wrap py-12 grid gap-9 lg:grid-cols-[1.25fr_repeat(5,minmax(0,1fr))]">
        <div className="grid gap-3 content-start">
          <Logo onDark height={34} />
          <p className="max-w-[28ch] text-[#d9e6dc]">{t.brand.tagline}</p>
          <p className="text-sm text-[#c3d5ca]">{BRAND.supporting}</p>
          <div className="flex flex-wrap gap-3 pt-1 text-sm">
            {BRAND.supportEmail && <a className="inline-flex items-center gap-1.5" href={`mailto:${BRAND.supportEmail}`}><Mail size={15} />Email support</a>}
            {BRAND.supportPhone && <a className="inline-flex items-center gap-1.5" href={`tel:${BRAND.supportPhone}`}><Phone size={15} />Call support</a>}
            {BRAND.social.instagram && <a className="inline-flex items-center gap-1.5" href={BRAND.social.instagram} target="_blank" rel="noreferrer"><Instagram size={15} />Instagram</a>}
          </div>
        </div>
        {cols.map((c) => (
          <nav key={c.h} aria-label={c.h} className="grid gap-2 content-start">
            <p className="font-semibold text-[#e4c995]">{c.h}</p>
            {c.links.map(([href, label]) => <Link key={`${href}-${label}`} href={href} className="py-1 text-sm">{label}<ArrowUpRight aria-hidden className="inline ml-1 opacity-60" size={12} /></Link>)}
          </nav>
        ))}
      </div>
      <div className="border-t border-white/15">
        <div className="wrap py-5 text-sm text-[#c3d5ca] flex flex-wrap gap-x-6 gap-y-2">
          <span>© {new Date().getFullYear()} {BRAND.name}. {t.footer.rights}</span>
          {BRAND.supportEmail && <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>}
          {BRAND.supportPhone && <a href={`tel:${BRAND.supportPhone}`}>{BRAND.supportPhone}</a>}
          {BRAND.grievanceOfficer && <span>Grievance Officer: {BRAND.grievanceOfficer}</span>}
        </div>
      </div>
    </footer>
  );
}
