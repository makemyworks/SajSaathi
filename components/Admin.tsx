"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, ExternalLink, LayoutDashboard, Store, CalendarDays, ClipboardCheck, LifeBuoy, ShieldCheck, ChevronRight } from "lucide-react";
import type { AdminResource } from "@/lib/core/admin-resources";
import { useData } from "@/lib/client";
import { NAV } from "@/lib/nav";
import { Logo } from "@/lib/shared/Logo";
import { Spinner, Notice } from "@/lib/shared/ui";
import { BRAND } from "@/lib/shared/brand";

export type Meta = { me: { id: string; name?: string; email?: string; adminRole?: string; mfaEnabled: boolean }; permissions: string[]; resources: (AdminResource & { canManage: boolean })[]; allPermissions: string[] };
const Ctx = createContext<{ meta: Meta | null }>({ meta: null });
export function useAdmin() { const { meta } = useContext(Ctx); return { meta, can: (p: string) => !!meta?.permissions.includes(p), resource: (k: string) => meta?.resources.find((r) => r.key === k) }; }

export function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const isLogin = path.startsWith("/admin/login");
  const { data, error, loading, reload } = useData<Meta>(isLogin ? null : "admin/meta");
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [path]);
  if (isLogin) return <>{children}</>;
  if (!data) return <div className="min-h-dvh grid place-items-center p-5 bg-[#f6f7f4]"><div className="panel p-6 w-full max-w-lg grid gap-3">{error ? <><h1 className="text-xl">Admin console unavailable</h1><Notice tone="bad">{error}</Notice><button className="btn btn-primary justify-self-start" onClick={() => reload()}>Try again</button><Link className="underline" href="/admin/login">Return to admin sign in</Link></> : <Spinner label={loading ? "Loading secure admin console…" : "Loading…"} />}</div></div>;
  const nav = NAV.map((g) => ({ ...g, items: g.items.filter((i) => data.permissions.includes(i.perm)) })).filter((g) => g.items.length);
  const active = (href: string) => href === "/admin" ? path === "/admin" : path.startsWith(href.split(/[?#]/)[0]) && href !== "/";
  const sidebar = (
    <>
      <div className="mb-7 px-2 grid gap-2"><Logo onDark height={30} /><p className="text-xs tracking-[.16em] uppercase text-[#c7d6cb]">Founder workspace</p></div>
      <nav aria-label="Admin" className="grid gap-4">
        {nav.map((g) => (
          <div key={g.group} className="grid gap-1">
            <p className="admin-sidebar-group-title">{g.group}</p>
            {g.items.map((i) => <Link key={i.href} href={i.href} onClick={() => setOpen(false)} aria-current={active(i.href) ? "page" : undefined} className="admin-sidebar-link">{i.label}<ChevronRight aria-hidden className="ml-auto size-3 opacity-40" /></Link>)}
          </div>
        ))}
      </nav>
      <div className="mt-auto pt-6"><a className="admin-sidebar-link" href={BRAND.urls.customer} target="_blank" rel="noreferrer"><ExternalLink size={16} />Open customer website</a></div>
    </>
  );
  return (
    <Ctx.Provider value={{ meta: data }}>
      <div className="admin-shell lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="admin-sidebar hidden lg:flex lg:flex-col p-4 h-dvh sticky top-0 overflow-y-auto">{sidebar}</aside>
        {open && <div className="lg:hidden fixed inset-0 z-50 bg-[#14231e]/55" onClick={() => setOpen(false)}><aside className="admin-sidebar p-4 w-[min(20rem,86vw)] h-full overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}><button className="btn btn-sm btn-light mb-5 self-end" onClick={() => setOpen(false)} aria-label="Close menu"><X aria-hidden size={18} /></button>{sidebar}</aside></div>}
        <div className="min-w-0">
          <header className="admin-topbar sticky top-0 z-30">
            <div className="px-4 lg:px-8 h-[4.4rem] flex items-center gap-3">
              <button className="lg:hidden btn btn-sm btn-outline" aria-label="Open admin menu" onClick={() => setOpen(true)}><Menu aria-hidden size={19} /></button>
              <div className="min-w-0"><p className="font-bold text-[#1e352d] leading-tight">Saj Saathi <span className="muted font-medium">/ Admin</span></p><p className="hidden sm:block muted text-xs">Secure founder and operations workspace</p></div>
              <div className="ml-auto flex items-center gap-2">
                <Link href="/admin/applications" className="btn btn-sm btn-outline hidden md:inline-flex"><ClipboardCheck size={15} />Review applications</Link>
                <Link href="/admin/r/bookings" className="btn btn-sm btn-outline hidden sm:inline-flex"><CalendarDays size={15} />Bookings</Link>
                <a className="btn btn-sm btn-outline hidden xl:inline-flex" href={BRAND.urls.customer} target="_blank" rel="noreferrer"><Store size={15} />View site</a>
                <span className="hidden 2xl:inline text-sm text-[#617067]">{data.me.name} · {data.me.adminRole?.replace(/_/g, " ")}</span>
                {!data.me.mfaEnabled && <Link href="/admin/security" className="badge badge-warn hidden sm:inline-flex"><ShieldCheck size={13} />Enable MFA</Link>}
                <button className="btn btn-sm btn-outline" onClick={async () => { try { await fetch("/api/admin-session/logout", { method: "POST" }); } finally { location.href = "/admin/login"; } }}><LogOut aria-hidden size={16} /><span className="hidden sm:inline">Log out</span></button>
              </div>
            </div>
          </header>
          <main className="admin-content px-4 lg:px-8 py-6 lg:py-8">{children}</main>
        </div>
      </div>
    </Ctx.Provider>
  );
}
