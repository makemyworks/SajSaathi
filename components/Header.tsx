import Link from "next/link";
import { ArrowUpRight, CalendarDays, CircleUserRound, Compass, HelpCircle, Menu, Scissors, Store, UserRound } from "lucide-react";
import { Logo } from "@/lib/shared/Logo";
import { BRAND } from "@/lib/shared/brand";
import { currentUser, dict } from "@/lib/session";
import { LanguageSwitch } from "./LanguageSwitch";
import { LogoutButton } from "./LogoutButton";

export async function Header() {
  const [t, user] = await Promise.all([
    dict(),
    currentUser().catch((error) => {
      console.error("[Saj Saathi] Could not resolve the current customer session:", error);
      return null;
    }),
  ]);
  const links = [
    { href: "/services", label: t.nav.services, Icon: Scissors },
    { href: "/providers", label: t.nav.providers, Icon: Compass },
    { href: "/offers", label: t.footer.offers, Icon: ArrowUpRight },
    { href: "/how-it-works", label: t.nav.howItWorks, Icon: HelpCircle },
    { href: "/partner", label: t.nav.forPartners, Icon: Store },
  ];
  return (
    <header className="customer-site-header">
      <a href="#main" className="skip-link">{t.nav.skip}</a>
      <div className="wrap customer-header-inner">
        <Link href="/" className="shrink-0" aria-label={`${BRAND.name} home`}><Logo height={34} /></Link>
        <nav aria-label="Main" className="customer-desktop-nav">
          {links.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
        </nav>
        <div className="customer-header-actions ml-auto">
          <LanguageSwitch className="hidden sm:inline-flex" />
          {user ? (
            <>
              <Link href="/account/bookings" className="btn btn-sm btn-outline hidden sm:inline-flex"><CalendarDays aria-hidden size={16} />{t.nav.bookings}</Link>
              <Link href="/account" className="btn btn-sm btn-primary"><UserRound aria-hidden size={17} /><span className="hidden sm:inline">{t.nav.account}</span></Link>
              <span className="hidden xl:inline-flex"><LogoutButton label={t.nav.logout} /></span>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-sm btn-outline hidden sm:inline-flex">{t.nav.login}</Link>
              <Link href="/signup" className="btn btn-sm btn-primary">{t.nav.signup}</Link>
            </>
          )}
          <details className="customer-mobile-menu">
            <summary className="btn btn-sm btn-outline" aria-label={t.nav.menu}><Menu aria-hidden size={20} /></summary>
            <div className="customer-mobile-menu-panel">
              {links.map((l) => <Link key={l.href} href={l.href}><l.Icon aria-hidden size={17} />{l.label}</Link>)}
              <Link href="/cities"><Compass aria-hidden size={17} />{t.footer.cities}</Link>
              <Link href="/help"><HelpCircle aria-hidden size={17} />{t.nav.help}</Link>
              {user ? <><Link href="/account/bookings"><CalendarDays aria-hidden size={17} />{t.nav.bookings}</Link><Link href="/account"><CircleUserRound aria-hidden size={17} />{t.nav.account}</Link></> : <><Link href="/login">{t.nav.login}</Link><Link href="/signup">{t.nav.signup}</Link></>}
              <div className="p-2 flex flex-wrap items-center gap-2"><LanguageSwitch />{user && <LogoutButton label={t.nav.logout} />}</div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
