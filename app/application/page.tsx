"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleDot } from "lucide-react";
import type { Category, DocumentRecord, Provider } from "@/lib/core/types";
import { api, useData } from "@/lib/client";
import { Notice, Spinner } from "@/lib/shared/ui";
import { usePartner } from "@/components/Partner";
import { Field } from "@/components/Field";
import { Upload } from "@/components/Upload";

type AppData = { application: Provider | null; category: Category | null; checklist?: { missing: string[]; complete: boolean }; documents?: Omit<DocumentRecord, "storageKey">[] };

export default function ApplicationPage() {
  const { t, pick, reloadApp } = usePartner();
  const { data, loading, error, reload } = useData<AppData>("partner/application");
  const refresh = () => { void reload(); void reloadApp(); };
  if (loading && !data) return <Spinner label={t.common.loading} />;
  if (error && !data) return <div className="grid gap-3"><Notice tone="bad">Your application information could not be loaded: {error}</Notice><button type="button" className="btn btn-outline justify-self-start" onClick={() => reload()}>Try again</button></div>;
  if (!data?.application) return <StartForm onStarted={refresh} />;
  const p = data.application, cat = data.category, missing = data.checklist?.missing ?? [];
  if (!cat) return <section className="grid gap-3"><Notice tone="bad">Your application is saved, but its service category could not be loaded. Your information has not been deleted. Please retry or contact support.</Notice><button type="button" className="btn btn-outline justify-self-start" onClick={() => reload()}>Reload application</button><Link className="btn btn-outline justify-self-start" href="/support">Contact support</Link></section>;
  const editable = ["draft", "documents_required", "rejected"].includes(p.status);
  const stepLabel = (m: string) => (t.apply.steps as Record<string, string>)[m] ?? (m.startsWith("field:") ? pick(cat.onboardingFields.find((f) => `field:${f.key}` === m)?.label) : m.startsWith("credential:") ? pick(cat.requiredCredentials.find((c) => `credential:${c.key}` === m)?.label) : m);

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl">{t.apply.title}</h1>
      <Notice tone={p.status === "approved" ? "ok" : p.status === "rejected" || p.status === "suspended" ? "bad" : "info"}>
        <strong>{t.status[p.status]}</strong>{p.statusNote && <span className="block mt-1">{t.apply.note}: {p.statusNote}</span>}
      </Notice>
      {editable && (
        <section className="panel p-5 grid gap-2"><h2 className="text-lg">{t.apply.checklist}</h2>
          <ul className="grid gap-1">{["address", "service_mode", "doc:id_proof", "services", "agreement"].concat(missing.filter((m) => m.startsWith("field:") || m.startsWith("credential:") || m === "service_area")).filter((v, i, a) => a.indexOf(v) === i).map((m) => (
            <li key={m} className="flex items-center gap-2">{missing.includes(m) ? <CircleDot aria-hidden size={18} className="text-[var(--color-warn)]" /> : <CheckCircle2 aria-hidden size={18} className="text-[var(--color-ok)]" />}{stepLabel(m)}</li>
          ))}</ul>
        </section>
      )}
      <DetailsForm p={p} cat={cat} editable={editable} onSaved={refresh} />
      <section className="panel p-5 grid gap-4">
        <h2 className="text-lg">{t.apply.documents}</h2>
        <p className="muted text-[0.95rem]">{t.apply.docHint}</p>
        <Upload kind="id_proof" label={t.apply.idProof} done={data.documents?.some((d) => d.kind === "id_proof")} onDone={refresh} disabled={!editable} />
        {cat.requiredCredentials.map((c) => <Upload key={c.key} kind="certificate" credentialKey={c.key} label={`${pick(c.label)}${c.mandatory ? " *" : ""}`} done={p.credentials.some((x) => x.key === c.key && x.value)} onDone={refresh} disabled={!editable} />)}
        {cat.verificationRequirements.length > 0 && <ul className="list-disc pl-5 muted text-[0.95rem]">{cat.verificationRequirements.map((v) => <li key={v.en}>{pick(v)}</li>)}</ul>}
      </section>
      <section className="panel p-5 flex flex-wrap gap-3">
        <Link className="btn btn-outline" href="/services">{t.apply.goServices}</Link>
        <Link className="btn btn-outline" href="/schedule">{t.apply.goHours}</Link>
      </section>
      <Agreement accepted={!!p.agreementAcceptedAt} onDone={refresh} disabled={!editable} />
      {editable && <SubmitBox ready={data.checklist?.complete ?? false} onDone={refresh} />}
    </div>
  );
}

function StartForm({ onStarted }: { onStarted: () => void }) {
  const { t, pick } = usePartner();
  const { data, loading: categoriesLoading, error: categoriesError, reload: reloadCategories } = useData<{ categories: Category[] }>("partner/categories");
  const [cat, setCat] = useState("");
  const [kind, setKind] = useState<"business" | "individual">("business");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const draftKey = "ss_partner_application_start_v1";

  // Keep the first step on this device until the central API confirms it was saved.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<{ categoryId: string; kind: "business" | "individual"; businessName: string; phone: string }>;
        if (typeof saved.categoryId === "string") setCat(saved.categoryId);
        if (saved.kind === "business" || saved.kind === "individual") setKind(saved.kind);
        if (typeof saved.businessName === "string") setBusinessName(saved.businessName);
        if (typeof saved.phone === "string") setPhone(saved.phone);
      } else if (new URLSearchParams(location.search).get("kind") === "individual") {
        setKind("individual");
      }
    } catch { /* Ignore a corrupted local draft; the server remains the source of truth. */ }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    try { localStorage.setItem(draftKey, JSON.stringify({ categoryId: cat, kind, businessName, phone, savedAt: Date.now() })); }
    catch { /* Storage may be unavailable in private browsing; submission still works. */ }
  }, [draftReady, cat, kind, businessName, phone]);

  const categories = data?.categories ?? [];
  return (
    <form className="grid gap-5" onSubmit={async (e) => {
      e.preventDefault();
      if (busy || !draftReady) return;
      setBusy(true); setErr("");
      try {
        await api("partner/application", "POST", { categoryId: cat, kind, businessName: businessName.trim(), phone: phone.trim() });
        try { localStorage.removeItem(draftKey); } catch { /* non-fatal */ }
        onStarted();
      } catch (x) { setErr((x as Error).message || "We could not save your application. Your draft is still on this device; please try again."); }
      finally { setBusy(false); }
    }}>
      <div className="grid gap-1">
        <span className="partner-kicker">STEP 1 · BUSINESS BASICS</span>
        <h1 className="text-2xl">{t.apply.chooseCategory}</h1>
        <p className="muted">Choose the service type that best describes your work. You can complete the remaining details after this step.</p>
      </div>

      {categoriesLoading && !data ? <Spinner label={t.common.loading} /> : categoriesError && !data ? (
        <section className="panel p-4 grid gap-3"><Notice tone="bad">Service categories could not be loaded: {categoriesError}</Notice><button type="button" className="btn btn-outline justify-self-start" onClick={() => reloadCategories()}>Try again</button></section>
      ) : categories.length === 0 ? (
        <section className="panel p-4 grid gap-2"><Notice tone="info">No active service categories are available right now. Your account is safe. Please try again later or contact support.</Notice><button type="button" className="btn btn-outline justify-self-start" onClick={() => reloadCategories()}>Refresh categories</button></section>
      ) : (
        <div className="grid gap-2" role="radiogroup" aria-label="Choose a service category">
          {categories.map((c) => (
            <label key={c._id} className={`panel p-4 flex gap-3 cursor-pointer transition-colors ${cat === c._id ? "border-[var(--color-teal-800)] bg-[var(--color-teal-50)]" : ""}`}>
              <input type="radio" name="categoryId" value={c._id} className="size-5 mt-1 accent-[var(--color-teal-800)]" checked={cat === c._id} onChange={() => setCat(c._id)} />
              <span><span className="font-semibold text-lg block">{pick(c.name)}</span><span className="muted">{pick(c.description)}</span></span>
            </label>
          ))}
        </div>
      )}

      <fieldset className="panel p-4 grid gap-2"><legend className="font-semibold px-1">{t.apply.kind}</legend>
        <label className="flex items-center gap-3 min-h-11"><input type="radio" className="size-5 accent-[var(--color-teal-800)]" checked={kind === "business"} onChange={() => setKind("business")} />{t.apply.business}</label>
        <label className="flex items-center gap-3 min-h-11"><input type="radio" className="size-5 accent-[var(--color-teal-800)]" checked={kind === "individual"} onChange={() => setKind("individual")} />{t.apply.individual}</label>
      </fieldset>
      <label className="field"><span>{kind === "individual" ? "Professional / display name" : t.apply.businessName}</span><input name="businessName" className="input" required minLength={2} maxLength={100} value={businessName} onChange={(e) => setBusinessName(e.target.value)} autoComplete="organization" /></label>
      <label className="field"><span>{t.auth.phone}</span><input name="phone" className="input" required inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={18} placeholder="98765 43210" /></label>
      <p className="muted text-sm">Your progress on this first step is saved on this device until the application is saved to Saj Saathi.</p>
      {err && <Notice tone="bad">{err}</Notice>}
      <button className="btn btn-primary btn-xl" disabled={!cat || !businessName.trim() || !phone.trim() || busy || !draftReady || categories.length === 0}>{busy ? "Saving your application…" : t.apply.start}</button>
    </form>
  );
}

function DetailsForm({ p, cat, editable, onSaved }: { p: Provider; cat: Category; editable: boolean; onSaved: () => void }) {
  const { t } = usePartner();
  const [s, setS] = useState({ businessName: p.businessName, about: p.about ?? "", email: p.email ?? "", address: p.address, inStore: p.inStore, atHome: p.atHome, pins: (p.serviceArea?.pins ?? []).join(", "), travel: p.travelFeePaise ? String(p.travelFeePaise / 100) : "", answers: p.onboardingAnswers });
  useEffect(() => { setS((x) => ({ ...x, businessName: p.businessName })); }, [p.businessName]);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [localDraftRestored, setLocalDraftRestored] = useState(false);
  const draftKey = `ss_partner_application_details_${p._id}`;
  const initialServerUpdate = useMemo(() => new Date(p.updatedAt).getTime() || 0, [p.updatedAt]);
  const draftLoadedFor = useRef("");
  useEffect(() => {
    if (draftLoadedFor.current === p._id) return;
    draftLoadedFor.current = p._id;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const saved = JSON.parse(raw) as { savedAt?: number; state?: typeof s };
        if (saved.state && Number(saved.savedAt || 0) > initialServerUpdate) { setS(saved.state); setLocalDraftRestored(true); }
        else localStorage.removeItem(draftKey);
      }
    } catch { /* A broken local draft must never prevent the server application from loading. */ }
  }, [draftKey, initialServerUpdate, p._id]);
  useEffect(() => {
    try { localStorage.setItem(draftKey, JSON.stringify({ savedAt: Date.now(), state: s })); }
    catch { /* local draft persistence is optional; server save remains available. */ }
  }, [draftKey, s]);
  const addr = (k: keyof Provider["address"], v: string) => setS({ ...s, address: { ...s.address, [k]: v } });
  return (
    <form className="panel p-5 grid gap-4" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setMsg(null);
      try {
        await api("partner/application", "PATCH", {
          ...(editable ? { businessName: s.businessName, onboardingAnswers: s.answers } : {}),
          about: s.about, email: s.email || undefined, address: s.address, inStore: s.inStore, atHome: s.atHome,
          serviceArea: { pins: s.pins.split(/[\s,]+/).filter(Boolean) }, travelFeePaise: s.travel ? Math.round(Number(s.travel) * 100) : 0,
        });
        try { localStorage.removeItem(draftKey); } catch { /* non-fatal */ }
        setLocalDraftRestored(false);
        setMsg({ tone: "ok", text: t.apply.saved }); onSaved();
      } catch (x) { setMsg({ tone: "bad", text: (x as Error).message }); } finally { setBusy(false); }
    }}>
      <h2 className="text-lg">{t.apply.details}</h2>
      <p className="muted text-sm">{localDraftRestored ? "We restored your unsaved edits from this device. Save details to sync them to your Saj Saathi account." : "Complete these details and save. Your submitted information is retained in your Saj Saathi account."}</p>
      <label className="field"><span>{t.apply.businessName}</span><input className="input" disabled={!editable} value={s.businessName} onChange={(e) => setS({ ...s, businessName: e.target.value })} /></label>
      <label className="field"><span>{t.apply.about}</span><textarea className="input" maxLength={1500} value={s.about} onChange={(e) => setS({ ...s, about: e.target.value })} /><small>{t.apply.aboutHint}</small></label>
      <label className="field"><span>{t.auth.email}</span><input className="input" type="email" value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} /></label>
      <fieldset className="grid gap-3"><legend className="font-semibold mb-1">{t.apply.address}</legend>
        <label className="field"><span>{t.apply.line1}</span><input className="input" value={s.address.line1} onChange={(e) => addr("line1", e.target.value)} /></label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="field"><span>{t.apply.locality}</span><input className="input" value={s.address.locality ?? ""} onChange={(e) => addr("locality", e.target.value)} /></label>
          <label className="field"><span>{t.apply.city}</span><input className="input" value={s.address.city} onChange={(e) => addr("city", e.target.value)} /></label>
          <label className="field"><span>{t.apply.state}</span><input className="input" value={s.address.state} onChange={(e) => addr("state", e.target.value)} /></label>
          <label className="field"><span>{t.apply.pin}</span><input className="input" inputMode="numeric" maxLength={6} value={s.address.pin} onChange={(e) => addr("pin", e.target.value.replace(/\D/g, ""))} /></label>
        </div>
      </fieldset>
      <fieldset className="grid gap-2"><legend className="font-semibold mb-1">{t.apply.where}</legend>
        {cat.inStoreAllowed && <label className="flex items-center gap-3"><input type="checkbox" className="size-6 accent-[var(--color-teal-800)]" checked={s.inStore} onChange={(e) => setS({ ...s, inStore: e.target.checked })} />{t.apply.inStore}</label>}
        {cat.atHomeAllowed && <label className="flex items-center gap-3"><input type="checkbox" className="size-6 accent-[var(--color-teal-800)]" checked={s.atHome} onChange={(e) => setS({ ...s, atHome: e.target.checked })} />{t.apply.atHome}</label>}
        {s.atHome && <><label className="field"><span>{t.apply.pins}</span><input className="input" inputMode="numeric" value={s.pins} onChange={(e) => setS({ ...s, pins: e.target.value })} placeholder="302001, 302006" /></label><label className="field"><span>{t.apply.travelFee}</span><input className="input" inputMode="numeric" value={s.travel} onChange={(e) => setS({ ...s, travel: e.target.value.replace(/[^\d.]/g, "") })} /></label></>}
      </fieldset>
      {cat.onboardingFields.length > 0 && (
        <fieldset className="grid gap-3"><legend className="font-semibold mb-1">{t.apply.questions}</legend>
          {cat.onboardingFields.map((f) => <Field key={f.key} f={f} disabled={!editable} value={s.answers[f.key]} onChange={(v) => setS({ ...s, answers: { ...s.answers, [f.key]: v } })} />)}
        </fieldset>
      )}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <div><button className="btn btn-primary" disabled={busy}>{t.apply.save}</button></div>
    </form>
  );
}

function Agreement({ accepted, onDone, disabled }: { accepted: boolean; onDone: () => void; disabled: boolean }) {
  const { t } = usePartner();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  return (
    <section className="panel p-5 grid gap-3">
      <h2 className="text-lg">{t.apply.agreementTitle}</h2>
      <p className="text-[0.95rem]">{t.apply.agreementBody}</p>
      {msg && <Notice tone="bad">{msg}</Notice>}
      {accepted ? <span className="badge badge-ok justify-self-start">{t.apply.accepted}</span> : <button className="btn btn-primary justify-self-start" disabled={busy || disabled} onClick={async () => { setBusy(true); setMsg(""); try { await api("partner/agreement", "POST"); onDone(); } catch (error) { setMsg((error as Error).message || "We could not save your agreement. Please try again."); } finally { setBusy(false); } }}>{busy ? t.common.loading : t.apply.accept}</button>}
    </section>
  );
}

function SubmitBox({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const { t } = usePartner();
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <section className="grid gap-3">
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <button type="button" className="btn btn-primary btn-xl" disabled={!ready || busy} onClick={async () => { setBusy(true); setMsg(null); try { await api("partner/application/submit", "POST"); setMsg({ tone: "ok", text: t.apply.submitted }); onDone(); } catch (x) { setMsg({ tone: "bad", text: (x as Error).message }); } finally { setBusy(false); } }}>{busy ? "Submitting…" : t.apply.submit}</button>
    </section>
  );
}
