"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Notice, Empty } from "@/lib/shared/ui";
import { dateTime } from "@/lib/shared/format";
import { useI18n } from "../I18n";

async function call(url: string, method: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error?.message ?? "Error");
  return j;
}
function useAction() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok?: string) => { setBusy(true); setMsg(null); try { await fn(); if (ok) setMsg({ tone: "ok", text: ok }); router.refresh(); } catch (e) { setMsg({ tone: "bad", text: (e as Error).message }); } finally { setBusy(false); } };
  return { msg, busy, run };
}

export function ProfileForm({ name, email, phone, locale: current, marketing }: { name: string; email?: string; phone?: string; locale: string; marketing: boolean }) {
  const { t } = useI18n();
  const { msg, busy, run } = useAction();
  return (
    <form className="panel p-5 grid gap-4" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(async () => { await call("/api/v1/me", "PATCH", { name: f.get("name"), email: f.get("email") || undefined, locale: f.get("locale"), marketing: f.get("marketing") === "on" }); document.cookie = `ss_locale=${f.get("locale")}; path=/; max-age=31536000; samesite=lax`; }, t.account.saved); }}>
      <label className="field"><span>{t.account.name}</span><input name="name" className="input" defaultValue={name} required minLength={2} autoComplete="name" /></label>
      <label className="field"><span>{t.account.email}</span><input name="email" type="email" className="input" defaultValue={email} autoComplete="email" /></label>
      <label className="field"><span>{t.account.phone}</span><input className="input" value={phone ?? ""} disabled readOnly /></label>
      <label className="field"><span>{t.account.language}</span><select name="locale" className="input" defaultValue={current}><option value="en">English</option><option value="hi">हिंदी</option></select></label>
      <label className="flex items-start gap-3"><input name="marketing" type="checkbox" defaultChecked={marketing} className="size-5 mt-1 accent-[var(--color-teal-800)]" /><span>{t.account.marketing}</span></label>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <div><button className="btn btn-primary" disabled={busy}>{t.account.save}</button></div>
    </form>
  );
}

export function PasswordForm() {
  const { t } = useI18n();
  const { msg, busy, run } = useAction();
  return (
    <form className="panel p-5 grid gap-4" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const form = e.currentTarget; run(async () => { await call("/api/v1/auth/password", "POST", { current: f.get("current"), next: f.get("next") }); form.reset(); }, t.account.saved); }}>
      <h3>{t.account.password}</h3>
      <label className="field"><span>{t.account.currentPassword}</span><input name="current" type="password" className="input" required autoComplete="current-password" /></label>
      <label className="field"><span>{t.account.newPassword}</span><input name="next" type="password" className="input" required minLength={8} autoComplete="new-password" /><small>{t.auth.passwordHint}</small></label>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <div><button className="btn btn-outline" disabled={busy}>{t.account.password}</button></div>
    </form>
  );
}

type Addr = { _id: string; label?: string; line1: string; locality?: string; landmark?: string; city: string; state: string; pin: string; isDefault?: boolean };
export function AddressManager({ addresses }: { addresses: Addr[] }) {
  const { t } = useI18n();
  const { msg, busy, run } = useAction();
  const [adding, setAdding] = useState(addresses.length === 0);
  return (
    <div className="grid gap-4">
      {addresses.length > 0 && (
        <ul className="panel divide-y divide-[var(--color-line)]">
          {addresses.map((a) => (
            <li key={a._id} className="p-4 flex gap-3 flex-wrap items-start">
              <div className="flex-1 min-w-[12rem]"><p className="font-semibold">{a.label || a.locality || a.city}{a.isDefault && <span className="badge badge-teal ml-2">✓</span>}</p><p className="muted">{[a.line1, a.locality, a.landmark, a.city, a.state, a.pin].filter(Boolean).join(", ")}</p></div>
              {!a.isDefault && <button className="btn btn-sm btn-outline" disabled={busy} onClick={() => run(() => call(`/api/v1/me/addresses/${a._id}`, "PATCH"))}>{t.account.makeDefault}</button>}
              <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => run(() => call(`/api/v1/me/addresses/${a._id}`, "DELETE"))}>{t.account.remove}</button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <form className="panel p-5 grid sm:grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); run(async () => { await call("/api/v1/me/addresses", "POST", { ...f, isDefault: f.isDefault === "on" }); setAdding(false); }); }}>
          <label className="field sm:col-span-2"><span>{t.booking.addressLine}</span><input name="line1" className="input" required minLength={3} autoComplete="address-line1" /></label>
          <label className="field"><span>{t.booking.locality}</span><input name="locality" className="input" /></label>
          <label className="field"><span>{t.booking.landmark}</span><input name="landmark" className="input" /></label>
          <label className="field"><span>{t.booking.city}</span><input name="city" className="input" required autoComplete="address-level2" /></label>
          <label className="field"><span>{t.booking.state}</span><input name="state" className="input" required autoComplete="address-level1" /></label>
          <label className="field"><span>{t.booking.pin}</span><input name="pin" className="input" required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} autoComplete="postal-code" /></label>
          <label className="field"><span>Label</span><input name="label" className="input" placeholder="Home, Work…" maxLength={30} /></label>
          <label className="flex items-center gap-3 sm:col-span-2"><input name="isDefault" type="checkbox" className="size-5 accent-[var(--color-teal-800)]" />{t.account.makeDefault}</label>
          <div className="sm:col-span-2 flex gap-2"><button className="btn btn-primary" disabled={busy}>{t.account.save}</button>{addresses.length > 0 && <button type="button" className="btn btn-outline" onClick={() => setAdding(false)}>{t.nav.close}</button>}</div>
        </form>
      ) : <div><button className="btn btn-outline" onClick={() => setAdding(true)}>{t.account.addAddress}</button></div>}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </div>
  );
}

type N = { _id: string; title: string; body: string; link?: string; read: boolean; createdAt: string };
export function NotificationList({ items }: { items: N[] }) {
  const { t, locale } = useI18n();
  const { busy, run } = useAction();
  if (!items.length) return <Empty title={t.account.noNotifications} />;
  return (
    <div className="grid gap-3">
      <div><button className="btn btn-sm btn-outline" disabled={busy} onClick={() => run(() => call("/api/v1/me/notifications", "PATCH", { all: true }))}>{t.account.markAllRead}</button></div>
      <ul className="panel divide-y divide-[var(--color-line)]">
        {items.map((n) => (
          <li key={n._id} className={`p-4 grid gap-1 ${n.read ? "" : "bg-[var(--color-teal-50)]"}`}>
            <p className="font-semibold">{n.title}</p><p>{n.body}</p>
            <p className="muted text-sm">{dateTime(n.createdAt, locale)}{n.link && <> · <a className="underline" href={n.link.startsWith("/bookings/") ? `/account${n.link}` : n.link}>Open</a></>}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PushOptIn({ vapidKey }: { vapidKey: string | null }) {
  const { t } = useI18n();
  const [state, setState] = useState<"idle" | "on" | "denied" | "unsupported">("idle");
  if (!vapidKey) return null;
  return (
    <button className="btn btn-sm btn-outline" disabled={state === "on"} onClick={async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setState("unsupported"); return; }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState("denied"); return; }
      const reg = await navigator.serviceWorker.ready;
      const key = Uint8Array.from(atob(vapidKey.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(vapidKey.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      await call("/api/v1/me/push", "POST", sub.toJSON());
      setState("on");
    }}><Bell aria-hidden size={18} />{state === "on" ? "✓" : t.account.notifications}{state === "denied" ? " — blocked in browser settings" : state === "unsupported" ? " — not supported on this browser" : ""}</button>
  );
}

type Ticket = { _id: string; ref: string; subject: string; status: string; category: string; updatedAt: string; messages: { byRole: string; text: string; at: string }[] };
export function TicketCenter({ tickets, bookingId }: { tickets: Ticket[]; bookingId?: string }) {
  const { t, locale } = useI18n();
  const { msg, busy, run } = useAction();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="grid gap-4">
      <form className="panel p-5 grid gap-3" onSubmit={(e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); const form = e.currentTarget; run(async () => { await call("/api/v1/me/tickets", "POST", { ...f, bookingId: bookingId || undefined }); form.reset(); }, t.account.saved); }}>
        <h3>{t.account.newTicket}</h3>
        <label className="field"><span>{t.account.ticketCategory}</span><select name="category" className="input" defaultValue={bookingId ? "booking" : "other"}><option value="booking">Booking</option><option value="payment">Payment / refund</option><option value="safety">Safety concern</option><option value="account">Account</option><option value="other">Other</option></select></label>
        <label className="field"><span>{t.account.subject}</span><input name="subject" className="input" required minLength={3} maxLength={140} /></label>
        <label className="field"><span>{t.account.describe}</span><textarea name="text" className="input" required minLength={5} maxLength={4000} /></label>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <div><button className="btn btn-primary" disabled={busy}>{t.account.send}</button></div>
      </form>
      {tickets.length > 0 && (
        <ul className="panel divide-y divide-[var(--color-line)]">
          {tickets.map((x) => (
            <li key={x._id} className="p-4 grid gap-2">
              <button className="text-left flex gap-3 flex-wrap items-center" onClick={() => setOpen(open === x._id ? null : x._id)} aria-expanded={open === x._id}><span className="font-semibold flex-1">{x.subject}</span><span className="badge">{x.status}</span><span className="muted text-sm tabular-nums">{x.ref}</span></button>
              {open === x._id && (
                <div className="grid gap-2">
                  {x.messages.map((m, i) => <p key={i} className={`p-3 rounded-lg ${m.byRole === "admin" ? "bg-[var(--color-teal-50)]" : "bg-[var(--color-ivory)]"}`}><span className="muted text-sm block">{m.byRole === "admin" ? "Saj Saathi support" : "You"} · {dateTime(m.at, locale)}</span>{m.text}</p>)}
                  <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const form = e.currentTarget; run(async () => { await call(`/api/v1/me/tickets/${x._id}`, "POST", { text: f.get("text") }); form.reset(); }); }}><input name="text" className="input" required /><button className="btn btn-outline" disabled={busy}>{t.account.send}</button></form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DeleteAccount() {
  const { t } = useI18n();
  const [sure, setSure] = useState(false);
  const { msg, busy, run } = useAction();
  return (
    <div className="panel p-5 grid gap-3 border-[#f0c8c4]">
      <h3>{t.account.deleteTitle}</h3>
      <p className="muted">{t.account.deleteBody}</p>
      <label className="flex items-center gap-3"><input type="checkbox" className="size-5" checked={sure} onChange={(e) => setSure(e.target.checked)} />{t.common.yes}</label>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <div><button className="btn btn-danger" disabled={!sure || busy} onClick={() => run(async () => { await call("/api/v1/me/delete", "POST", {}); window.location.href = "/"; })}>{t.account.deleteCta}</button></div>
    </div>
  );
}
