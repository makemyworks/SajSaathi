"use client";
import { useState } from "react";
import { Logo } from "@/lib/shared/Logo";
import { Notice } from "@/lib/shared/ui";

export default function AdminLogin() {
  const [step, setStep] = useState<"pw" | "mfa">("pw");
  const [creds, setCreds] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (totp?: string) => {
    setErr(""); setBusy(true);
    const r = await fetch("/api/admin-session/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...creds, totp }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error?.message ?? "Login failed"); return; }
    if (j.mfaRequired) { setStep("mfa"); return; }
    const next = new URLSearchParams(location.search).get("next");
    location.href = next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
  };
  return (
    <div className="min-h-dvh grid place-items-center bg-[var(--color-teal-900)] p-4">
      <form className="panel p-6 w-full max-w-sm grid gap-4" onSubmit={(e) => { e.preventDefault(); if (step === "pw") submit(); else submit(String(new FormData(e.currentTarget).get("totp") ?? "")); }}>
        <Logo height={28} />
        <h1 className="text-xl">Admin sign in</h1>
        {step === "pw" ? (
          <>
            <label className="field"><span>Email</span><input className="input" type="email" required autoComplete="username" value={creds.email} onChange={(e) => setCreds({ ...creds, email: e.target.value })} /></label>
            <label className="field"><span>Password</span><input className="input" type="password" required autoComplete="current-password" value={creds.password} onChange={(e) => setCreds({ ...creds, password: e.target.value })} /></label>
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
