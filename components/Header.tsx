import Link from "next/link";
import { Menu, UserRound } from "lucide-react";
import { Logo } from "@/lib/shared/Logo";
import { BRAND } from "@/lib/shared/brand";
import { currentUser, dict } from "@/lib/session";
import { LanguageSwitch } from "./LanguageSwitch";
import { LogoutButton } from "./LogoutButton";

export async function Header() {
  const [t, user] = await Promise.all([
    dict(),
    currentUser().catch((error) => {
      // A stale session or temporary database outage must not take down the public header.
      console.error("[Saj Saathi] Could not resolve the current customer session:", error);
      return null;
    }),
  ]);
  const links = [
    { href: "/services", label: t.nav.services },
    { href: "/providers", label: t.nav.providers },
    { href: "/how-it-works", label: t.nav.howItWorks },
    { href: "/partner", label: t.nav.forPartners },
  ];
  return (
    <header className="bg-[var(--color-ivory)]/95 backdrop-blur border-b border-[var(--color-line)] sticky top-0 z-40">
      <a href="#main" className="skip-link">{t.nav.skip}</a>
      <div className="wrap flex items-center gap-3 h-16">
        <Link href="/" className="shrink-0" aria-label={`${BRAND.name} home`}><Logo height={30} /></Link>
        <nav aria-label="Main" className="hidden md:flex items-center gap-1 ml-6">
          {links.map((l) => <Link key={l.href} href={l.href} className="px-3 py-2 rounded-lg hover:bg-[var(--color-sand)] font-medium">{l.label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitch className="hidden sm:inline-flex" />
          {user ? (
            <Link href="/account" className="btn btn-sm btn-primary"><UserRound aria-hidden size={18} /><span className="hidden sm:inline">{t.nav.account}</span></Link>
          ) : (
            <Link href="/login" className="btn btn-sm btn-primary">{t.nav.login}</Link>
          )}
          <details className="md:hidden relative">
            <summary className="list-none btn btn-sm btn-outline cursor-pointer" aria-label={t.nav.menu}><Menu aria-hidden size={20} /></summary>
            <div className="absolute right-0 mt-2 w-64 panel p-2 shadow-lg grid">
              {links.map((l) => <Link key={l.href} href={l.href} className="px-3 py-3 rounded-lg hover:bg-[var(--color-sand)] font-medium">{l.label}</Link>)}
              {user && <Link href="/account/bookings" className="px-3 py-3 rounded-lg hover:bg-[var(--color-sand)] font-medium">{t.nav.bookings}</Link>}
              <div className="p-2 flex gap-2 flex-wrap"><LanguageSwitch />{user && <LogoutButton label={t.nav.logout} />}</div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
