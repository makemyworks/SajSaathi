"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, BadgeCheck, Eye, EyeOff, LockKeyhole, ShieldCheck, Store, UserRound, Wifi } from "lucide-react";
import { Logo } from "@/lib/shared/Logo";
import { BRAND } from "@/lib/shared/brand";
import { usePartner } from "./Partner";

type AuthPayload = { user?: { _id?: string; name?: string }; error?: { code?: string; message?: string } };

function safeNextPath(value: string | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}

function normaliseIndianPhone(value: string) {
  let digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits);
}

function getErrorMessage(payload: AuthPayload, status: number, fallback: string) {
  const code = payload.error?.code;
  const message = payload.error?.message?.trim();
  if (code === "account_exists") return "An account with this mobile number or email already exists. Please log in instead.";
  if (code === "invalid_credentials") return "The mobile/email or password is incorrect. Check your details and try again.";
  if (code === "account_inactive") return "This account is not active. Please contact Saj Saathi support.";
  if (code === "rate_limited" || status === 429) return "Too many attempts. Please wait a few minutes before trying again.";
  if (code === "bad_origin" || status === 403) return message || "Your request could not be verified. Reload the page and try again.";
  if (status === 503 || status === 502) return message || "The sign-in service is temporarily unavailable. Please check the connection and try again.";
  if (status === 400 || status === 409 || status === 422) return message || fallback;
  if (message) return message;
  return status >= 500 ? "Saj Saathi could not complete this request right now. Please try again shortly." : fallback;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { t, locale } = usePartner();
  const searchParams = useSearchParams();
  const fallback = mode === "signup" ? "/application" : "/";
  const next = useMemo(() => safeNextPath(searchParams.get("next"), fallback), [searchParams, fallback]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  const isHindi = locale === "hi";
  const copy = isHindi ? {
    eyebrow: "सज साथी पार्टनर नेटवर्क",
    headline: "अपने काम को आगे बढ़ाएँ।",
    subhead: "बुकिंग, सेवाएँ और अपने बिज़नेस को एक ही जगह से संभालें।",
    point1: "बुकिंग और ग्राहक अनुरोध संभालें",
    point2: "सेवाओं, कीमतों और समय को अपडेट करें",
    point3: "कमाई और बिज़नेस की जानकारी देखें",
    secure: "आपकी जानकारी सुरक्षित रखी जाती है",
    welcome: mode === "login" ? "वापसी पर स्वागत है" : "हमारे पार्टनर नेटवर्क से जुड़ें",
    intro: mode === "login" ? "अपने पार्टनर अकाउंट में सुरक्षित रूप से लॉग इन करें।" : "अपना अकाउंट बनाएँ। इसके बाद आप अपने बिज़नेस या सेवा की जानकारी भर सकेंगे।",
    managedHint: "यदि Founder Admin ने आपका Partner login सेट किया है, तो मुख्य Saj Saathi वेबसाइट के Vercel में तय ईमेल और पासवर्ड का उपयोग करें।",
    show: "पासवर्ड दिखाएँ",
    hide: "पासवर्ड छिपाएँ",
    submitWait: "कृपया रुकें…",
    loginBtn: "पार्टनर लॉग इन करें",
    signupBtn: "पार्टनर अकाउंट बनाएँ",
    mobileHint: "10 अंकों का भारतीय मोबाइल नंबर दर्ज करें",
    passwordHint: "कम से कम 8 अक्षर, एक अंग्रेज़ी अक्षर और एक अंक",
    emailOptional: "ईमेल (वैकल्पिक)",
    checkConnection: "कनेक्शन स्थिति देखें",
    support: "मदद चाहिए? सहायता केंद्र देखें",
    newPartner: "नए पार्टनर हैं?",
  } : {
    eyebrow: "SAJ SAATHI PARTNER NETWORK",
    headline: "Grow your business.\nOwn your day.",
    subhead: "One simple workspace for bookings, services, your team and business performance.",
    point1: "Manage bookings and customer requests",
    point2: "Update services, prices and availability",
    point3: "Follow earnings and business activity",
    secure: "Your account is protected with a secure sign-in",
    welcome: mode === "login" ? "Welcome back" : "Join the partner network",
    intro: mode === "login" ? "Sign in to manage your Saj Saathi business." : "Create your account first. You can add your business or professional details next.",
    managedHint: "If the Founder Admin configured your Partner login, use the email and password set in the main Saj Saathi Vercel project.",
    show: "Show password",
    hide: "Hide password",
    submitWait: "Please wait…",
    loginBtn: "Sign in to Partner Portal",
    signupBtn: "Create partner account",
    mobileHint: "Use a valid 10-digit Indian mobile number",
    passwordHint: "At least 8 characters, one letter and one number",
    emailOptional: "Email address (optional)",
    checkConnection: "Check service connection",
    newPartner: "New to Saj Saathi?",
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const rawPassword = String(values.get("password") ?? "");
    const identifier = String(values.get("identifier") ?? "").trim();
    const name = String(values.get("name") ?? "").trim();
    const phone = String(values.get("phone") ?? "").trim();
    const email = String(values.get("email") ?? "").trim() || undefined;
    const acceptTerms = values.get("terms") === "on";
    const body = mode === "login"
      ? { identifier, password: rawPassword }
      : { name, phone, email, password: rawPassword, acceptTerms, locale };

    if (mode === "login" && (!identifier || !rawPassword)) {
      setError(isHindi ? "मोबाइल/ईमेल और पासवर्ड दर्ज करें।" : "Enter your mobile number or email and password.");
      return;
    }
    if (mode === "signup") {
      if (name.length < 2) { setError(isHindi ? "अपना पूरा नाम दर्ज करें।" : "Please enter your full name."); return; }
      if (!normaliseIndianPhone(phone)) { setError(isHindi ? "सही 10 अंकों का भारतीय मोबाइल नंबर दर्ज करें।" : "Enter a valid 10-digit Indian mobile number."); return; }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(isHindi ? "सही ईमेल पता दर्ज करें या इसे खाली छोड़ें।" : "Enter a valid email address or leave it blank."); return; }
      if (rawPassword.length < 8 || rawPassword.length > 128 || !/[A-Za-z]/.test(rawPassword) || !/\d/.test(rawPassword)) {
        setError(isHindi ? "पासवर्ड में कम से कम 8 अक्षर, एक अंग्रेज़ी अक्षर और एक अंक होना चाहिए।" : "Use at least 8 characters, including one letter and one number.");
        return;
      }
      if (!acceptTerms) { setError(isHindi ? "आगे बढ़ने के लिए नियम और गोपनीयता नीति स्वीकार करें।" : "Please accept the Terms and Privacy Policy to continue."); return; }
    }

    setBusy(true);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch(`/api/session/${mode}`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({})) as AuthPayload;
      if (!response.ok) {
        setError(getErrorMessage(payload, response.status, t.common.error));
        return;
      }
      if (!payload.user) {
        setError(isHindi ? "लॉग इन पूरा नहीं हुआ। कृपया दोबारा प्रयास करें।" : "The service did not confirm your account. Please try again.");
        return;
      }
      window.location.assign(next);
    } catch {
      if (controller.signal.aborted) {
        setError(isHindi ? "अनुरोध में अधिक समय लग रहा है। कनेक्शन जाँचकर फिर प्रयास करें।" : "This request took too long. Check your connection and try again.");
      } else {
        setError(isHindi ? "सर्वर से संपर्क नहीं हो पाया। इंटरनेट कनेक्शन जाँचें और फिर प्रयास करें।" : "Could not reach Saj Saathi. Check your internet connection and try again.");
      }
    } finally {
      window.clearTimeout(timer);
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-frame">
        <aside className="auth-story" aria-label="Saj Saathi Partner benefits">
          <div className="auth-story-brand"><Logo onDark height={35} /></div>
          <span className="auth-eyebrow"><Store size={15} aria-hidden /> {copy.eyebrow}</span>
          <h1 className="auth-story-title">{copy.headline.split("\n").map((line) => <span key={line}>{line}</span>)}</h1>
          <p className="auth-story-copy">{copy.subhead}</p>
          <div className="auth-benefits">
            {[copy.point1, copy.point2, copy.point3].map((item) => <div className="auth-benefit" key={item}><BadgeCheck size={18} aria-hidden /><span>{item}</span></div>)}
          </div>
          <div className="auth-story-foot"><ShieldCheck size={17} aria-hidden /><span>{copy.secure}</span></div>
          <div className="auth-orbit auth-orbit-one" aria-hidden="true" />
          <div className="auth-orbit auth-orbit-two" aria-hidden="true" />
        </aside>

        <section className="auth-card-wrap">
          <div className="auth-mobile-brand"><Logo height={30} /></div>
          <div className="auth-card">
            <div className="auth-card-heading">
              <span className="auth-card-kicker">{mode === "login" ? (isHindi ? "पार्टनर अकाउंट" : "PARTNER ACCOUNT") : (isHindi ? "शुरुआत करें" : "GET STARTED")}</span>
              <h2>{copy.welcome}</h2>
              <p>{copy.intro}</p>
              {mode === "login" && <p className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-2 text-sm text-[var(--color-muted)]">{copy.managedHint}</p>}
            </div>

            <form className="auth-form" onSubmit={submit} noValidate>
              {mode === "signup" && <label className="field"><span>{t.auth.name}</span><input name="name" className="input auth-input" required minLength={2} maxLength={80} autoComplete="name" placeholder={isHindi ? "जैसे: राहुल शर्मा" : "e.g. Rahul Sharma"} /></label>}
              {mode === "login" ? (
                <label className="field"><span>{t.auth.phone} / {t.auth.email}</span><input name="identifier" className="input auth-input" required autoComplete="username" inputMode="text" placeholder={isHindi ? "मोबाइल नंबर या ईमेल" : "Mobile number or email"} /></label>
              ) : (
                <>
                  <label className="field"><span>{t.auth.phone}</span><input name="phone" className="input auth-input" required inputMode="tel" autoComplete="tel" maxLength={16} placeholder="98765 43210" aria-describedby="partner-phone-hint" /><small id="partner-phone-hint">{copy.mobileHint}</small></label>
                  <label className="field"><span>{copy.emailOptional}</span><input name="email" type="email" className="input auth-input" autoComplete="email" maxLength={120} placeholder="name@example.com" /></label>
                </>
              )}

              <div className="field">
                <label htmlFor="partner-password">{t.auth.password}</label>
                <span className="auth-password-wrap">
                  <LockKeyhole size={18} aria-hidden className="auth-password-icon" />
                  <input id="partner-password" name="password" type={showPassword ? "text" : "password"} className="input auth-input auth-password-input" required minLength={mode === "signup" ? 8 : 1} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isHindi ? "अपना पासवर्ड दर्ज करें" : "Enter your password"} aria-describedby={mode === "signup" ? "partner-password-hint" : undefined} />
                  <button type="button" className="auth-show-password" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? copy.hide : copy.show} title={showPassword ? copy.hide : copy.show}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </span>
                {mode === "signup" && <small id="partner-password-hint">{copy.passwordHint}</small>}
              </div>

              {mode === "signup" && <div className="auth-terms"><input id="partner-accept-terms" name="terms" type="checkbox" required className="auth-checkbox" aria-label={t.auth.terms} /><span>{t.auth.terms} — <a href={`${BRAND.urls.customer}/legal/terms`} target="_blank" rel="noreferrer">{isHindi ? "नियम" : "Terms"}</a> · <a href={`${BRAND.urls.customer}/legal/privacy`} target="_blank" rel="noreferrer">{isHindi ? "गोपनीयता" : "Privacy"}</a></span></div>}

              {error && <div className="auth-error" role="alert"><strong>{isHindi ? "अनुरोध पूरा नहीं हुआ" : "We couldn't complete that request"}</strong><span>{error}</span><a href="/api/health" target="_blank" rel="noreferrer"><Wifi size={15} aria-hidden /> {copy.checkConnection}</a></div>}

              <button type="submit" className="btn btn-primary btn-xl auth-submit" disabled={busy}>
                {busy ? <><span className="auth-spinner" aria-hidden /> {copy.submitWait}</> : <>{mode === "login" ? copy.loginBtn : copy.signupBtn} <ArrowRight size={18} aria-hidden /></>}
              </button>
            </form>

            <div className="auth-switch">
              {mode === "login" ? <>{copy.newPartner} <Link href="/signup">{isHindi ? "खाता बनाएँ" : "Create an account"}</Link></> : <>{isHindi ? "पहले से अकाउंट है?" : "Already have an account?"} <Link href="/login">{isHindi ? "लॉग इन करें" : "Log in"}</Link></>}
            </div>
            <div className="auth-card-footer"><span><ShieldCheck size={15} aria-hidden /> {isHindi ? "सुरक्षित पार्टनर पोर्टल" : "Secure partner portal"}</span><button type="button" onClick={() => { document.cookie = `ss_locale=${locale === "hi" ? "en" : "hi"}; path=/; max-age=31536000; samesite=lax`; location.reload(); }}>{locale === "hi" ? "English" : "हिंदी"}</button></div>
          </div>
          <p className="auth-bottom-note"><UserRound size={15} aria-hidden /> {isHindi ? "ग्राहक के रूप में बुकिंग करनी है?" : "Looking to book a service as a customer?"} <a href={BRAND.urls.customer}>{isHindi ? "ग्राहक वेबसाइट खोलें" : "Visit customer website"}</a></p>
        </section>
      </div>
    </main>
  );
}
