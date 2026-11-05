"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import type { AdminResource } from "@/lib/core/admin-resources";
import { useData } from "@/lib/client";
import { NAV } from "@/lib/nav";
import { Logo } from "@/lib/shared/Logo";
import { Spinner } from "@/lib/shared/ui";

export type Meta = { me: { id: string; name?: string; email?: string; adminRole?: string; mfaEnabled: boolean }; permissions: string[]; resources: (AdminResource & { canManage: boolean })[]; allPermissions: string[] };
const Ctx = createContext<{ meta: Meta | null }>({ meta: null });
export function useAdmin() { const { meta } = useContext(Ctx); return { meta, can: (p: string) => !!meta?.permissions.includes(p), resource: (k: string) => meta?.resources.find((r) => r.key === k) }; }

export function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const isLogin = path.startsWith("/admin/login");
  const { data, error, loading, reload } = useData<Meta>(isLogin ? null : "admin/meta");
  const [open, setOpen] = useState(false);
  if (isLogin) return <>{children}</>;
  if (!data) return <div className="p-8 grid gap-3">{error ? <><p className="text-[var(--color-bad)]">Could not load the admin console: {error}</p><button className="btn btn-outline justify-self-start" onClick={() => reload()}>Retry</button><Link className="underline" href="/admin/login">Return to admin sign in</Link></> : <Spinner label={loading ? "Loading admin console…" : "Loading…"} />}</div>;
  const nav = NAV.map((g) => ({ ...g, items: g.items.filter((i) => data.permissions.includes(i.perm)) })).filter((g) => g.items.length);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href.split(/[?#]/)[0]) && href !== "/");
  const sidebar = (
    <nav aria-label="Admin" className="grid gap-4 text-[0.95rem]">
      {nav.map((g) => (
        <div key={g.group} className="grid gap-0.5">
          <p className="px-3 text-[var(--color-gold-light)] text-sm font-semibold">{g.group}</p>
          {g.items.map((i) => <Link key={i.href} href={i.href} onClick={() => setOpen(false)} aria-current={active(i.href) ? "page" : undefined} className={`px-3 py-1.5 rounded-md ${active(i.href) ? "bg-white/15 text-white" : "text-[var(--color-teal-100)] hover:bg-white/10"}`}>{i.label}</Link>)}
        </div>
      ))}
    </nav>
  );
  return (
    <Ctx.Provider value={{ meta: data }}>
      <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
        <aside className="hidden lg:block bg-[var(--color-teal-900)] p-4 h-dvh sticky top-0 overflow-y-auto"><div className="mb-6 px-2"><Logo onDark height={26} /></div>{sidebar}</aside>
        {open && <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)}><aside className="bg-[var(--color-teal-900)] p-4 w-72 h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}><button className="btn btn-sm btn-light mb-4" onClick={() => setOpen(false)} aria-label="Close menu"><X aria-hidden size={18} /></button>{sidebar}</aside></div>}
        <div className="min-w-0">
          <header className="bg-white border-b border-[var(--color-line)] sticky top-0 z-30">
            <div className="px-4 lg:px-8 h-14 flex items-center gap-3">
              <button className="lg:hidden btn btn-sm btn-outline" aria-label="Open menu" onClick={() => setOpen(true)}><Menu aria-hidden size={18} /></button>
              <span className="font-semibold">Saj Saathi Admin</span>
              <span className="ml-auto muted text-[0.95rem] hidden sm:inline">{data.me.name} · {data.me.adminRole?.replace("_", " ")}</span>
              {!data.me.mfaEnabled && <Link href="/admin/security" className="badge badge-warn">Turn on MFA</Link>}
              <button className="btn btn-sm btn-outline" onClick={async () => { await fetch("/api/admin-session/logout", { method: "POST" }); location.href = "/admin/login"; }}><LogOut aria-hidden size={16} />Log out</button>
            </div>
          </header>
          <main className="px-4 lg:px-8 py-6 max-w-[90rem]">{children}</main>
        </div>
      </div>
    </Ctx.Provider>
  );
}
