"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "./I18n";
import type { Dict } from "@/lib/shared/i18n/en";

type AuthCopy = Dict["auth"];
type AuthMode = "login" | "signup";

function safeNextPath(value: string | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return fallback;
  if (value === "/login" || value === "/signup") return fallback;
  return value;
}

function apiError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: { message?: unknown } }).error;
    if (typeof error?.message === "string" && error.message.trim()) return error.message;
  }
  return fallback;
}

/** Customer sign-in/sign-up. Customer sessions are issued directly by the same-origin Main API. */
export function AuthForm({ mode }: { mode: AuthMode }) {
  const { t, locale } = useI18n();
  const copy = t.auth as AuthCopy;
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => safeNextPath(searchParams.get("next"), mode === "signup" ? "/account" : "/"),
    [searchParams, mode],
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const endpoint = mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
    const body = mode === "login"
      ? { identifier: identifier.trim(), password }
      : {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          password,
          acceptTerms,
          marketingConsent,
          locale,
        };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiError(payload, mode === "login" ? "Could not log in. Please check your details." : "Could not create your account. Please try again."));
      router.replace(nextPath);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.loginCta);
    } finally {
      setBusy(false);
    }
  }

  const alternateHref = mode === "login" ? "/signup" : "/login";
  const alternateLabel = mode === "login" ? copy.signupCta : copy.loginCta;
  const alternatePrompt = mode === "login" ? copy.noAccount : copy.haveAccount;

  return (
    <div className="grid gap-4">
      <form onSubmit={submit} className="grid gap-4" aria-busy={busy}>
        {mode === "signup" ? (
          <>
            <label className="field">
              <span>{copy.name}</span>
              <input className="input" name="name" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="field">
              <span>{copy.phone}</span>
              <input className="input" name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
            <label className="field">
              <span>{copy.email}</span>
              <input className="input" name="email" type="email" autoComplete="email" maxLength={120} value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
          </>
        ) : (
          <label className="field">
            <span>{copy.identifier}</span>
            <input className="input" name="identifier" autoComplete="username" required maxLength={120} value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
          </label>
        )}
        <label className="field">
          <span>{copy.password}</span>
          <input className="input" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 8 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} />
          {mode === "signup" && <small className="muted">{copy.passwordHint}</small>}
        </label>
        {mode === "signup" && (
          <>
            <label className="flex items-start gap-3 text-sm">
              <input className="mt-1" type="checkbox" checked={acceptTerms} required onChange={(event) => setAcceptTerms(event.target.checked)} />
              <span>{copy.terms}</span>
            </label>
            <p className="muted text-sm -mt-2">
              <Link className="underline" href="/legal/terms">{t.footer.terms}</Link>
              {" · "}
              <Link className="underline" href="/legal/privacy">{t.footer.privacy}</Link>
            </p>
            <label className="flex items-start gap-3 text-sm">
              <input className="mt-1" type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} />
              <span>{copy.marketing}</span>
            </label>
          </>
        )}
        {error && <p className="text-sm text-[var(--color-bad)]" role="alert">{error}</p>}
        <button className="btn btn-primary w-full" type="submit" disabled={busy}>
          {busy ? t.common.loading : mode === "login" ? copy.loginCta : copy.signupCta}
        </button>
      </form>
      <p className="text-sm text-center">
        {alternatePrompt}{" "}
        <Link className="underline font-semibold" href={alternateHref}>{alternateLabel}</Link>
      </p>
    </div>
  );
}
