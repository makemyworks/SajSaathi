"use client";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { Notice } from "@/lib/shared/ui";
import { useAdmin } from "@/components/Admin";

export default function Security() {
  const { meta } = useAdmin();
  const [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [mfaMsg, setMfaMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [profileMsg, setProfileMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const enabled = meta?.me.mfaEnabled;

  async function updateProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setProfileBusy(true); setProfileMsg(null);
    try {
      await api("auth/admin-profile", "PATCH", {
        name: data.get("name"), email: data.get("email"), currentPassword: data.get("currentPassword"),
      });
      form.reset();
      setProfileMsg({ tone: "ok", text: "Your name and email are saved permanently in the main database. Your new email will be used at the next login." });
      window.setTimeout(() => window.location.reload(), 900);
    } catch (x) {
      setProfileMsg({ tone: "bad", text: (x as Error).message });
    } finally { setProfileBusy(false); }
  }

  async function updatePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setPasswordBusy(true); setPasswordMsg(null);
    try {
      await api("auth/password", "POST", { current: data.get("current"), next: data.get("next") });
      setPasswordMsg({ tone: "ok", text: "Password changed and all previous admin sessions revoked. Redirecting to sign in…" });
      form.reset();
      await fetch("/api/admin-session/logout", { method: "POST" }).catch(() => undefined);
      window.location.href = "/admin/login?passwordChanged=1";
    } catch (x) {
      setPasswordMsg({ tone: "bad", text: (x as Error).message });
    } finally { setPasswordBusy(false); }
  }

  return (
    <div className="grid gap-5 max-w-2xl">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Founder account & security</h1>
        <p className="muted">Manage your permanent admin login details, password and two-step verification.</p>
      </div>

      <section className="panel p-5 grid gap-3">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">Admin login identity</h2>
          <p className="muted text-sm">Changes are saved to MongoDB and remain in effect after redeployment. Confirm your current password to change your name or email.</p>
        </div>
        <form className="grid gap-3" onSubmit={updateProfile}>
          <label className="field"><span>Admin name</span><input className="input" name="name" defaultValue={meta?.me.name ?? "Founder"} minLength={2} maxLength={80} required /></label>
          <label className="field"><span>Admin login email</span><input className="input" name="email" type="email" defaultValue={meta?.me.email ?? ""} maxLength={120} autoComplete="email" required /></label>
          <label className="field"><span>Current password (to confirm this change)</span><input className="input" name="currentPassword" type="password" autoComplete="current-password" required /></label>
          {profileMsg && <Notice tone={profileMsg.tone}>{profileMsg.text}</Notice>}
          <button className="btn btn-primary justify-self-start" disabled={profileBusy}>{profileBusy ? "Saving…" : "Save admin identity"}</button>
        </form>
      </section>

      <section className="panel p-5 grid gap-3">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">Two-step login (MFA)</h2>
          <p className="muted text-sm">Status: <span className={`badge ${enabled ? "badge-ok" : "badge-warn"}`}>{enabled ? "On" : "Off"}</span></p>
        </div>
        {!enabled && !setup && <button className="btn btn-primary justify-self-start" onClick={async () => { try { setSetup(await api("admin/mfa", "POST", { step: "start" })); setMfaMsg(null); } catch (x) { setMfaMsg({ tone: "bad", text: (x as Error).message }); } }}>Set up authenticator app</button>}
        {setup && (
          <div className="grid gap-3">
            <p>In Google Authenticator, Microsoft Authenticator or a similar app, choose &quot;Enter a setup key&quot; and type:</p>
            <p className="font-mono text-lg break-all select-all bg-[var(--color-ivory)] p-3 rounded-lg">{setup.secret}</p>
            <details><summary className="cursor-pointer muted">Setup link</summary><p className="font-mono text-sm break-all">{setup.otpauth}</p></details>
            <form className="flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); try { await api("admin/mfa", "POST", { step: "enable", code: new FormData(e.currentTarget).get("code") }); setMfaMsg({ tone: "ok", text: "MFA is enabled. You will need a code at every login." }); setSetup(null); window.location.reload(); } catch (x) { setMfaMsg({ tone: "bad", text: (x as Error).message }); } }}>
              <input name="code" className="input max-w-40 tracking-widest" inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="123456" required />
              <button className="btn btn-primary">Turn on MFA</button>
            </form>
          </div>
        )}
        {enabled && <form className="flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); try { await api("admin/mfa", "POST", { step: "disable", code: new FormData(e.currentTarget).get("code") }); setMfaMsg({ tone: "ok", text: "MFA disabled." }); window.location.reload(); } catch (x) { setMfaMsg({ tone: "bad", text: (x as Error).message }); } }}><input name="code" className="input max-w-40" inputMode="numeric" maxLength={6} placeholder="Current code" required /><button className="btn btn-danger">Turn off MFA</button></form>}
        {mfaMsg && <Notice tone={mfaMsg.tone}>{mfaMsg.text}</Notice>}
      </section>

      <section className="panel p-5 grid gap-3">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">Change admin password</h2>
          <p className="muted text-sm">This change is stored permanently in MongoDB. All active admin sessions will be revoked, so sign in again with the new password.</p>
        </div>
        <form className="grid gap-3" onSubmit={updatePassword}>
          <label className="field"><span>Current password</span><input name="current" type="password" className="input" autoComplete="current-password" required /></label>
          <label className="field"><span>New password</span><input name="next" type="password" className="input" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
          <p className="muted text-sm">Use at least 8 characters with letters and numbers; 12 or more is recommended.</p>
          {passwordMsg && <Notice tone={passwordMsg.tone}>{passwordMsg.text}</Notice>}
          <button className="btn btn-outline justify-self-start" disabled={passwordBusy}>{passwordBusy ? "Changing…" : "Change password"}</button>
        </form>
      </section>

      <section className="rounded-xl border border-[var(--color-line)] p-4 grid gap-2">
        <h2 className="font-semibold">About Vercel bootstrap variables</h2>
        <p className="muted text-sm">Changing BOOTSTRAP_ADMIN_EMAIL or BOOTSTRAP_ADMIN_PASSWORD in Vercel does not automatically overwrite an existing database account. To apply those values permanently, pull Production variables into this project and run <code>npm run setup -- --sync-admin</code>. This updates the existing single super-admin record and revokes its old sessions.</p>
      </section>
    </div>
  );
}
