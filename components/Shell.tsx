"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUpRight, Bell, Building2, CalendarDays, ClipboardList,
  Clock3, FileText, Home, LifeBuoy, LogOut, Menu, QrCode, Scissors,
  Settings, Star, UserRound, Users, Wallet,
} from "lucide-react";
import { InstallButton } from "./InstallButton";
import { Logo } from "@/lib/shared/Logo";
import { StatusBadge } from "@/lib/shared/ui";
import { usePartner } from "./Partner";

export function Shell({ children }: { children: React.ReactNode }) {
  const { t, app, appError, appLoading, reloadApp, has } = usePartner();
  const path = usePathname();
  const [offline, setOffline] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isAuth = path.startsWith("/login") || path.startsWith("/signup");

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      (window as Window & { __sspInstallPrompt?: Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> } }).__sspInstallPrompt = event as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
      window.dispatchEvent(new Event("ssp-installable"));
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((error) => console.error("Partner service worker registration failed", error));
    }
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
    };
  }, []);

  const businessKind = app?.application?.kind;
  const groups = [
    { title: "Workspace", items: [
      { href: "/", label: t.nav.home, Icon: Home, show: true },
      { href: "/bookings", label: t.nav.bookings, Icon: ClipboardList, show: true },
      { href: "/calendar", label: t.nav.calendar, Icon: CalendarDays, show: true },
    ] },
    { title: "Manage business", items: [
      { href: "/services", label: t.nav.services, Icon: Scissors, show: true },
      { href: "/staff", label: t.nav.staff, Icon: Users, show: has("staff") && businessKind === "business" },
      { href: "/schedule", label: t.nav.schedule, Icon: Clock3, show: true },
      { href: "/branches", label: t.nav.branches, Icon: Building2, show: has("branches") && businessKind === "business" },
    ] },
    { title: "Grow & engage", items: [
      { href: "/money", label: t.nav.money, Icon: Wallet, show: true },
      { href: "/reviews", label: t.nav.reviews, Icon: Star, show: true },
      { href: "/promote", label: t.nav.promote, Icon: QrCode, show: true },
      { href: "/notifications", label: t.nav.notifications, Icon: Bell, show: true },
    ] },
    { title: "Account", items: [
      { href: "/application", label: t.nav.application, Icon: FileText, show: true },
      { href: "/profile", label: t.nav.profile, Icon: UserRound, show: true },
      { href: "/support", label: t.nav.support, Icon: LifeBuoy, show: true },
      { href: "/settings", label: t.nav.settings, Icon: Settings, show: true },
    ] },
  ].map((group) => ({ ...group, items: group.items.filter((item) => item.show) })).filter((group) => group.items.length > 0);

  const tabs = [
    { href: "/", label: t.nav.home, Icon: Home },
    { href: "/bookings", label: t.nav.bookings, Icon: ClipboardList },
    { href: "/calendar", label: t.nav.calendar, Icon: CalendarDays },
    { href: "/services", label: t.nav.services, Icon: Scissors },
    { href: "/more", label: t.nav.more, Icon: Menu },
  ];
  const active = (href: string) => href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await fetch("/api/session/logout", { method: "POST", credentials: "same-origin", cache: "no-store" }); }
    catch { /* The login page will clear the unusable client session path. */ }
    finally { window.location.assign("/login"); }
  }

  if (isAuth) return <><div className="auth-install"><InstallButton /></div>{children}</>;

  return (
    <div className="partner-layout">
      <aside className="partner-sidebar">
        <div className="partner-sidebar-brand"><Logo onDark height={32} /><span className="partner-brand-caption">PARTNER WORKSPACE</span></div>
        <div className="partner-sidebar-business">
          <span className="partner-business-mark">{(app?.application?.businessName || "S").trim().charAt(0).toUpperCase()}</span>
          <span className="min-w-0"><strong className="block truncate">{app?.application?.businessName || "Your business"}</strong><small>{app?.application ? t.status[app.application.status] : "Complete your application"}</small></span>
        </div>
        <nav aria-label="Partner workspace" className="partner-side-nav">
          {groups.map((group) => <section key={group.title} className="partner-nav-group">
            <h2>{group.title}</h2>
            {group.items.map(({ href, label, Icon }) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={`partner-nav-link ${active(href) ? "is-active" : ""}`}><Icon size={18} aria-hidden /><span>{label}</span>{active(href) && <span className="partner-nav-indicator" />}</Link>)}
          </section>)}
        </nav>
        <div className="partner-sidebar-footer">
          <Link href="/support" className="partner-help-link"><LifeBuoy size={17} aria-hidden /><span>Partner support</span><ArrowUpRight size={15} aria-hidden /></Link>
          <button type="button" onClick={logout} disabled={loggingOut} className="partner-logout"><LogOut size={17} aria-hidden />{loggingOut ? "Signing out…" : t.nav.logout}</button>
          <small>SAJ SAATHI · INDIA</small>
        </div>
      </aside>

      <div className="partner-main-column">
        <header className="partner-topbar">
          <div className="partner-topbar-mobile"><Logo variant="symbol" height={30} /></div>
          <div className="partner-topbar-title"><span className="partner-topbar-kicker">{t.app}</span><strong>{app?.application?.businessName || "Partner workspace"}</strong></div>
          <div className="partner-topbar-actions">
            {app?.application && <StatusBadge status={app.application.status} label={t.status[app.application.status]} />}
            <Link href="/notifications" className="partner-icon-button" aria-label={t.nav.notifications}><Bell size={19} aria-hidden /></Link>
            <Link href="/profile" className="partner-avatar-link" aria-label={t.nav.profile}><UserRound size={18} aria-hidden /></Link>
            <InstallButton />
          </div>
        </header>

        {offline && <div role="status" className="partner-offline"><span className="partner-offline-dot" />{t.common.offline}</div>}
        {appError && !appLoading && <div role="alert" className="partner-connection-alert"><div><strong>Could not load your partner profile.</strong><p>{appError}</p><p>Check the secure API connection at <a href="/api/health" target="_blank" rel="noreferrer">/api/health</a>.</p></div><button type="button" className="btn btn-outline btn-sm" onClick={() => reloadApp()}>Try again</button></div>}

        <main id="main" className="partner-main-content"><div className="partner-content-inner">{children}</div></main>
        <nav aria-label="Main navigation" className="partner-mobile-nav">
          {tabs.map(({ href, label, Icon }) => <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={`partner-mobile-tab ${active(href) ? "is-active" : ""}`}><Icon aria-hidden size={21} /><span>{label}</span></Link>)}
        </nav>
      </div>
    </div>
  );
}
