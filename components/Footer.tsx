import Link from "next/link";
import { Logo } from "@/lib/shared/Logo";
import { BRAND } from "@/lib/shared/brand";
import { dict } from "@/lib/session";

export async function Footer() {
  // Public shell content must remain available if MongoDB is unavailable.
  // Configure these support details through NEXT_PUBLIC_SUPPORT_EMAIL/PHONE.
  const t = await dict();
  const email = BRAND.supportEmail, phone = BRAND.supportPhone;
  const cols = [
    { h: BRAND.name, links: [["/about", t.footer.about], ["/how-it-works", t.footer.how], ["/cities", t.footer.cities], ["/offers", t.footer.offers]] },
    { h: t.nav.help, links: [["/help", t.footer.help], ["/faq", t.footer.faq], ["/contact", t.footer.contact], ["/accessibility", t.footer.accessibility]] },
    { h: t.nav.forPartners, links: [["/partner", t.footer.partner], ["/professional", t.footer.professional]] },
    { h: "Legal", links: [["/legal/privacy", t.footer.privacy], ["/legal/terms", t.footer.terms], ["/legal/refunds", t.footer.refunds]] },
  ];
  return (
    <footer className="bg-[var(--color-teal-900)] text-[var(--color-ivory)] mt-16">
      <div className="wrap py-12 grid gap-10 md:grid-cols-[1.2fr_repeat(4,1fr)]">
        <div className="grid gap-3 content-start">
          <Logo onDark height={30} />
          <p className="text-[var(--color-teal-100)] max-w-[28ch]">{t.brand.tagline}</p>
        </div>
        {cols.map((c) => (
          <nav key={c.h} aria-label={c.h} className="grid gap-2 content-start">
            <p className="font-semibold text-[var(--color-gold-light)]">{c.h}</p>
            {c.links.map(([href, label]) => <Link key={href} href={href} className="text-[var(--color-teal-100)] hover:text-white py-1">{label}</Link>)}
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="wrap py-5 text-sm text-[var(--color-teal-100)] flex flex-wrap gap-x-6 gap-y-2">
          <span>© {new Date().getFullYear()} {BRAND.name}. {t.footer.rights}</span>
          {email && <a href={`mailto:${email}`}>{email}</a>}
          {phone && <a href={`tel:${phone}`}>{phone}</a>}
          {BRAND.grievanceOfficer && <span>Grievance Officer: {BRAND.grievanceOfficer}</span>}
        </div>
      </div>
    </footer>
  );
}
