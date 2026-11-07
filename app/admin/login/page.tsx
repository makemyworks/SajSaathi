"use client";
import { useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Logo } from "@/lib/shared/Logo";
import { Notice } from "@/lib/shared/ui";

export default function AdminLogin() {
  const [step, setStep] = useState<"pw" | "mfa">("pw");
  const [creds, setCreds] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const submit = async (totp?: string) => {
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/admin-session/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...creds, totp }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error?.message ?? "Login failed. Check your details and try again."); return; }
      if (j.mfaRequired) { setStep("mfa"); return; }
      const next = new URLSearchParams(location.search).get("next");
      location.href = next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
    } catch {
      setErr("We could not reach Saj Saathi Admin. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-h-dvh grid place-items-center bg-[var(--color-teal-900)] p-4">
      <form className="panel p-6 w-full max-w-sm grid gap-4" onSubmit={(e) => { e.preventDefault(); if (step === "pw") submit(); else submit(String(new FormData(e.currentTarget).get("totp") ?? "")); }}>
        <Logo height={28} />
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-teal-800)]"><ShieldCheck size={16} /> Secure founder access</div>
        <h1 className="text-xl">Admin sign in</h1>
        {step === "pw" ? (
          <>
            <label className="field"><span>Email</span><input className="input" type="email" required autoComplete="username" value={creds.email} onChange={(e) => setCreds({ ...creds, email: e.target.value })} /></label>
            <label className="field"><span>Password</span><span className="relative block"><input className="input pr-14" type={showPassword ? "text" : "password"} required autoComplete="current-password" value={creds.password} onChange={(e) => setCreds({ ...creds, password: e.target.value })} /><button type="button" className="btn btn-sm btn-outline absolute right-2 top-1/2 -translate-y-1/2 !min-h-9 !px-2" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((v) => !v)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
          </>
        ) : (
          <label className="field"><span>6-digit code from your authenticator app</span><input name="totp" className="input tracking-[0.3em] text-center text-xl" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoComplete="one-time-code" autoFocus /></label>
        )}
        {err && <Notice tone="bad">{err}</Notice>}
        <button className="btn btn-primary" disabled={busy}>{step === "pw" ? "Continue" : "Verify"}</button>
        <p className="muted text-sm">There is no public sign-up. Ask a super admin to invite you.</p>
      </form>
    </div>
  );
}
