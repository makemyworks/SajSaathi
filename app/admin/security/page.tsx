"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { Notice } from "@/lib/shared/ui";
import { useAdmin } from "@/components/Admin";

export default function Security() {
  const { meta } = useAdmin();
  const [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const enabled = meta?.me.mfaEnabled;
  return (
    <div className="grid gap-4 max-w-xl">
      <h1 className="text-2xl">Two-step login (MFA)</h1>
      <p>Status: <span className={`badge ${enabled ? "badge-ok" : "badge-warn"}`}>{enabled ? "On" : "Off"}</span></p>
      {!enabled && !setup && <button className="btn btn-primary justify-self-start" onClick={async () => setSetup(await api("admin/mfa", "POST", { step: "start" }))}>Set up authenticator app</button>}
      {setup && (
        <div className="panel p-5 grid gap-3">
          <p>In Google Authenticator, Microsoft Authenticator or similar, choose &quot;Enter a setup key&quot; and type:</p>
          <p className="font-mono text-lg break-all select-all bg-[var(--color-ivory)] p-3 rounded-lg">{setup.secret}</p>
          <details><summary className="cursor-pointer muted">Setup link</summary><p className="font-mono text-sm break-all">{setup.otpauth}</p></details>
          <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); try { await api("admin/mfa", "POST", { step: "enable", code: new FormData(e.currentTarget).get("code") }); setMsg({ tone: "ok", text: "MFA is on. You'll need a code at every login." }); setSetup(null); location.reload(); } catch (x) { setMsg({ tone: "bad", text: (x as Error).message }); } }}>
            <input name="code" className="input max-w-40 tracking-widest" inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="123456" required /><button className="btn btn-primary">Turn on</button>
          </form>
        </div>
      )}
      {enabled && <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); try { await api("admin/mfa", "POST", { step: "disable", code: new FormData(e.currentTarget).get("code") }); location.reload(); } catch (x) { setMsg({ tone: "bad", text: (x as Error).message }); } }}><input name="code" className="input max-w-40" inputMode="numeric" maxLength={6} placeholder="Current code" required /><button className="btn btn-danger">Turn off MFA</button></form>}
      <form className="panel p-5 grid gap-3" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); try { await api("auth/password", "POST", { current: f.get("current"), next: f.get("next") }); setMsg({ tone: "ok", text: "Password changed. You'll need to log in again." }); } catch (x) { setMsg({ tone: "bad", text: (x as Error).message }); } }}>
        <h2 className="text-lg">Change password</h2>
        <input name="current" type="password" className="input" placeholder="Current password" autoComplete="current-password" required />
        <input name="next" type="password" className="input" placeholder="New password (12+ characters recommended)" autoComplete="new-password" minLength={8} required />
        <button className="btn btn-outline justify-self-start">Change password</button>
      </form>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </div>
  );
}
