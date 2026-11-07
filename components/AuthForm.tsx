"use client";
import { useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Notice } from "@/lib/shared/ui";
import { useI18n } from "./I18n";

function safeNext(n: string | null) { return n && n.startsWith("/") && !n.startsWith("//") ? n : "/account"; }

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { t, locale } = useI18n();
  const sp = useSearchParams();
  const next = safeNext(sp.get("next"));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form
      className="panel p-6 grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault(); setErr(""); setBusy(true);
        const fd = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
        const payload = mode === "login"
          ? { identifier: fd.identifier, password: fd.password }
          : { name: fd.name, phone: fd.phone, email: fd.email || undefined, password: fd.password, acceptTerms: fd.terms === "on", marketingConsent: fd.marketing === "on", locale };
        try {
          const r = await fetch(`/api/v1/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) { setErr(j.error?.message ?? t.common.error); return; }
          window.location.href = next;
        } catch {
          setErr("We could not reach Saj Saathi. Check your internet connection and try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-teal-800)]"><ShieldCheck size={16} /> Secure customer account</div>
      {mode === "signup" && <label className="field"><span>{t.auth.name}</span><input name="name" className="input" required minLength={2} autoComplete="name" /></label>}
      {mode === "login" ? (
        <label className="field"><span>{t.auth.identifier}</span><input name="identifier" className="input" required autoComplete="username" inputMode="email" /></label>
      ) : (
        <>
          <label className="field"><span>{t.auth.phone}</span><input name="phone" className="input" required inputMode="tel" autoComplete="tel-national" placeholder="98765 43210" /></label>
          <label className="field"><span>{t.auth.email}</span><input name="email" type="email" className="input" autoComplete="email" /></label>
        </>
      )}
      <label className="field"><span>{t.auth.password}</span><span className="relative block"><input name="password" type={showPassword ? "text" : "password"} className="input pr-14" required minLength={mode === "signup" ? 8 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} /><button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-sm btn-outline !min-h-9 !px-2" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>{mode === "signup" && <small>{t.auth.passwordHint}</small>}</label>
      {mode === "signup" && (
        <>
          <label className="flex items-start gap-3"><input name="terms" type="checkbox" required className="size-5 mt-1 accent-[var(--color-teal-800)]" /><span>{t.auth.terms} — <Link href="/legal/terms" className="underline">Terms</Link>, <Link href="/legal/privacy" className="underline">Privacy</Link></span></label>
          <label className="flex items-start gap-3"><input name="marketing" type="checkbox" className="size-5 mt-1 accent-[var(--color-teal-800)]" /><span>{t.auth.marketing}</span></label>
        </>
      )}
      {err && <Notice tone="bad"><span role="alert">{err}</span></Notice>}
      <button className="btn btn-primary btn-xl" disabled={busy}>{mode === "login" ? t.auth.loginCta : t.auth.signupCta}</button>
      <p className="muted text-sm text-center">Your information is used to manage your bookings and account securely.</p>
      <p className="text-center">
        {mode === "login" ? <>{t.auth.noAccount} <Link className="font-semibold underline" href={`/signup?next=${encodeURIComponent(next)}`}>{t.nav.signup}</Link></> : <>{t.auth.haveAccount} <Link className="font-semibold underline" href={`/login?next=${encodeURIComponent(next)}`}>{t.nav.login}</Link></>}
      </p>
    </form>
  );
}
