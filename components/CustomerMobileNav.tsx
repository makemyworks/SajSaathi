"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, House, Scissors, UserRound } from "lucide-react";
import { useI18n } from "./I18n";

export function CustomerMobileNav() {
  const path = usePathname();
  const { t } = useI18n();
  if (path === "/login" || path === "/signup") return null;
  const items = [
    { href: "/", label: t.nav.home, Icon: House },
    { href: "/services", label: t.nav.services, Icon: Scissors },
    { href: "/providers", label: t.nav.providers, Icon: Compass },
    { href: "/account/bookings", label: t.nav.bookings, Icon: CalendarDays },
    { href: "/account", label: t.nav.account, Icon: UserRound },
  ];
  const active = (href: string) => href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
  return <nav className="customer-mobile-nav" aria-label="Quick navigation">{items.map(({ href, label, Icon }) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}><Icon aria-hidden /><span>{label}</span></Link>)}</nav>;
}
