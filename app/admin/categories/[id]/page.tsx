"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { Category, FieldDef, LocalizedText } from "@/lib/core/types";
import { api, useData } from "@/lib/client";
import { Notice, Spinner } from "@/lib/shared/ui";

const EMPTY: Partial<Category> = {
  name: { en: "", hi: "" }, description: { en: "", hi: "" }, icon: "Flower2", vertical: "", providerTypes: [], requiredCredentials: [], verificationRequirements: [],
  onboardingFields: [], bookingFields: [], serviceFields: [], atHomeAllowed: false, inStoreAllowed: true,
  bookingRules: { minLeadMinutes: 60, maxAdvanceDays: 30, slotStepMinutes: 15, bufferMinutes: 0, requiresConsent: false },
  cancellationPolicy: { freeUntilHours: 4, lateFeePercent: 0, noShowFeePercent: 0 }, disallowedClaims: [], features: { staff: true, packages: true, branches: false },
  status: "inactive", visible: true, sortOrder: 100, pricing: {},
};
const ICONS = ["Scissors", "Sparkles", "Leaf", "PawPrint", "HeartHandshake", "Flower2"];

/** Category builder: everything a new service vertical needs, with no code change. */
export default function CategoryEdit() {
  const { id } = useParams() as { id: string };
  const isNew = id === "new";
  const router = useRouter();
  const { data } = useData<{ category: Category }>(isNew ? null : `admin/categories/${id}`);
  const [c, setC] = useState<Partial<Category> | null>(isNew ? EMPTY : null);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  useEffect(() => { if (data) setC(data.category); }, [data]);
  if (!c) return <Spinner label="Loading…" />;
  const set = (patch: Partial<Category>) => setC({ ...c, ...patch });
  const L = (label: string, v: LocalizedText | undefined, on: (x: LocalizedText) => void, area = false) => (
    <fieldset className="grid sm:grid-cols-2 gap-2"><legend className="font-semibold text-[0.95rem] mb-1">{label}</legend>
      {(["en", "hi"] as const).map((l) => area
        ? <textarea key={l} className="input" lang={l} placeholder={l === "en" ? "English" : "हिंदी"} value={v?.[l] ?? ""} onChange={(e) => on({ ...(v ?? { en: "" }), [l]: e.target.value } as LocalizedText)} />
        : <input key={l} className="input" lang={l} placeholder={l === "en" ? "English" : "हिंदी"} value={v?.[l] ?? ""} onChange={(e) => on({ ...(v ?? { en: "" }), [l]: e.target.value } as LocalizedText)} />)}
    </fieldset>
  );
  const num = (label: string, v: number | undefined, on: (n: number) => void, help?: string) => <label className="field"><span>{label}</span><input className="input" type="number" value={v ?? ""} onChange={(e) => on(Number(e.target.value))} />{help && <small>{help}</small>}</label>;
  const save = async () => {
    setMsg(null);
    try {
      if (isNew) { const j = await api<{ category: Category }>("admin/categories", "POST", c); router.push(`/admin/categories/${j.category._id}`); }
      else { await api(`admin/categories/${id}`, "PUT", c); setMsg({ tone: "ok", text: "Saved. Changes are live for customers and partners now." }); }
    } catch (e) { setMsg({ tone: "bad", text: (e as Error).message }); }
  };
  return (
    <form className="grid gap-5 max-w-4xl" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <Link href="/admin/categories" className="muted underline">← Categories</Link>
      <h1 className="text-2xl">{isNew ? "New category" : c.name?.en}</h1>

      <section className="panel p-5 grid gap-4">
        <h2 className="text-lg">Basics</h2>
        {L("Name *", c.name, (x) => set({ name: x }))}
        {L("Description", c.description, (x) => set({ description: x }), true)}
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="field"><span>URL slug</span><input className="input" value={c.slug ?? ""} onChange={(e) => set({ slug: e.target.value })} placeholder="auto from name" /></label>
          <label className="field"><span>Vertical key</span><input className="input" value={c.vertical ?? ""} onChange={(e) => set({ vertical: e.target.value })} placeholder="e.g. tailoring" /></label>
          <label className="field"><span>Icon</span><select className="input" value={c.icon ?? ""} onChange={(e) => set({ icon: e.target.value })}>{ICONS.map((i) => <option key={i}>{i}</option>)}</select></label>
        </div>
        <label className="field"><span>Provider types (comma separated)</span><input className="input" value={(c.providerTypes ?? []).join(", ")} onChange={(e) => set({ providerTypes: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></label>
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2"><input type="checkbox" className="size-5" checked={c.status === "active"} onChange={(e) => set({ status: e.target.checked ? "active" : "inactive" })} />Active (bookable)</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="size-5" checked={c.visible !== false} onChange={(e) => set({ visible: e.target.checked })} />Shown on website</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="size-5" checked={!!c.inStoreAllowed} onChange={(e) => set({ inStoreAllowed: e.target.checked })} />In-store allowed</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="size-5" checked={!!c.atHomeAllowed} onChange={(e) => set({ atHomeAllowed: e.target.checked })} />At-home allowed</label>
        </div>
        {num("Sort order", c.sortOrder, (n) => set({ sortOrder: n }))}
      </section>

      <section className="panel p-5 grid gap-4">
        <h2 className="text-lg">Booking rules & cancellation</h2>
        <div className="grid sm:grid-cols-4 gap-3">
          {num("Minimum notice (min)", c.bookingRules?.minLeadMinutes, (n) => set({ bookingRules: { ...c.bookingRules!, minLeadMinutes: n } }))}
          {num("Book up to (days ahead)", c.bookingRules?.maxAdvanceDays, (n) => set({ bookingRules: { ...c.bookingRules!, maxAdvanceDays: n } }))}
          {num("Slot step (min)", c.bookingRules?.slotStepMinutes, (n) => set({ bookingRules: { ...c.bookingRules!, slotStepMinutes: n } }))}
          {num("Buffer between bookings (min)", c.bookingRules?.bufferMinutes, (n) => set({ bookingRules: { ...c.bookingRules!, bufferMinutes: n } }))}
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {num("Free cancellation until (hours before)", c.cancellationPolicy?.freeUntilHours, (n) => set({ cancellationPolicy: { ...c.cancellationPolicy!, freeUntilHours: n } }))}
          {num("Late cancellation fee (%)", c.cancellationPolicy?.lateFeePercent, (n) => set({ cancellationPolicy: { ...c.cancellationPolicy!, lateFeePercent: n } }))}
          {num("No-show fee (%)", c.cancellationPolicy?.noShowFeePercent, (n) => set({ cancellationPolicy: { ...c.cancellationPolicy!, noShowFeePercent: n } }))}
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" className="size-5" checked={!!c.bookingRules?.requiresConsent} onChange={(e) => set({ bookingRules: { ...c.bookingRules!, requiresConsent: e.target.checked } })} />Customer must accept a consent / safety statement before booking</label>
        {c.bookingRules?.requiresConsent && L("Consent text", c.bookingRules.consentText, (x) => set({ bookingRules: { ...c.bookingRules!, consentText: x } }), true)}
        {L("Safety notice (shown on listings)", c.safetyNotice, (x) => set({ safetyNotice: x }))}
        <label className="field"><span>Words providers may not use (comma separated)</span><input className="input" value={(c.disallowedClaims ?? []).join(", ")} onChange={(e) => set({ disallowedClaims: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /><small>e.g. doctor, physiotherapist, vet, cure</small></label>
      </section>

      <section className="panel p-5 grid gap-4">
        <h2 className="text-lg">Pricing for this category</h2>
        <p className="muted text-[0.95rem]">Leave empty to use the platform defaults from System settings. A partner-specific commission (Pricing exceptions) overrides this.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="field"><span>Commission %</span><input className="input" type="number" value={c.pricing?.commissionPercent ?? ""} onChange={(e) => set({ pricing: { ...c.pricing, commissionPercent: e.target.value === "" ? undefined : Number(e.target.value) } })} /></label>
          <label className="field"><span>Customer booking fee (₹)</span><input className="input" type="number" value={c.pricing?.bookingFeePaise !== undefined ? c.pricing.bookingFeePaise / 100 : ""} onChange={(e) => set({ pricing: { ...c.pricing, bookingFeePaise: e.target.value === "" ? undefined : Math.round(Number(e.target.value) * 100) } })} /></label>
          <label className="field"><span>Default travel fee (₹)</span><input className="input" type="number" value={c.pricing?.travelFeePaise !== undefined ? c.pricing.travelFeePaise / 100 : ""} onChange={(e) => set({ pricing: { ...c.pricing, travelFeePaise: e.target.value === "" ? undefined : Math.round(Number(e.target.value) * 100) } })} /></label>
        </div>
      </section>

      <section className="panel p-5 grid gap-4">
        <h2 className="text-lg">Verification</h2>
        <ListEditor label="Required credentials" items={c.requiredCredentials ?? []} empty={{ key: "", label: { en: "" }, mandatory: false }} onChange={(x) => set({ requiredCredentials: x })} render={(it, up) => <>
          <input className="input" placeholder="Credential (English)" value={it.label.en} onChange={(e) => up({ ...it, label: { ...it.label, en: e.target.value } })} />
          <input className="input" placeholder="हिंदी" value={it.label.hi ?? ""} onChange={(e) => up({ ...it, label: { ...it.label, hi: e.target.value } })} />
          <label className="flex items-center gap-2 whitespace-nowrap"><input type="checkbox" checked={it.mandatory} onChange={(e) => up({ ...it, mandatory: e.target.checked })} />Mandatory</label>
        </>} />
        <ListEditor label="What we check (shown to applicants)" items={c.verificationRequirements ?? []} empty={{ en: "" }} onChange={(x) => set({ verificationRequirements: x })} render={(it, up) => <>
          <input className="input" placeholder="English" value={it.en} onChange={(e) => up({ ...it, en: e.target.value })} />
          <input className="input" placeholder="हिंदी" value={it.hi ?? ""} onChange={(e) => up({ ...it, hi: e.target.value })} />
        </>} />
      </section>

      <FieldsEditor title="Partner application questions" fields={c.onboardingFields ?? []} scope="provider" onChange={(x) => set({ onboardingFields: x })} />
      <FieldsEditor title="Questions asked when a customer books" fields={c.bookingFields ?? []} scope="customer" onChange={(x) => set({ bookingFields: x })} />
      <FieldsEditor title="Extra fields on each service" fields={c.serviceFields ?? []} scope="service" onChange={(x) => set({ serviceFields: x })} />

      <section className="panel p-5 grid gap-3">
        <h2 className="text-lg">Partner app features</h2>
        <div className="flex flex-wrap gap-5">{["staff", "packages", "branches", "petProfile"].map((f) => <label key={f} className="flex items-center gap-2"><input type="checkbox" className="size-5" checked={!!c.features?.[f]} onChange={(e) => set({ features: { ...c.features, [f]: e.target.checked } })} />{f}</label>)}</div>
      </section>

      <section className="panel p-5 grid gap-3">
        <h2 className="text-lg">SEO</h2>
        {L("Page title", c.seo?.title, (x) => set({ seo: { ...c.seo, title: x } }))}
        {L("Meta description", c.seo?.description, (x) => set({ seo: { ...c.seo, description: x } }), true)}
      </section>

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <div className="sticky bottom-0 bg-[var(--color-ivory)] py-3"><button className="btn btn-primary">{isNew ? "Create category" : "Save category"}</button></div>
    </form>
  );
}

function ListEditor<T>({ label, items, empty, onChange, render }: { label: string; items: T[]; empty: T; onChange: (x: T[]) => void; render: (it: T, up: (v: T) => void) => React.ReactNode }) {
  return (
    <fieldset className="grid gap-2"><legend className="font-semibold text-[0.95rem] mb-1">{label}</legend>
      {items.map((it, i) => <div key={i} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">{render(it, (v) => onChange(items.map((x, j) => (j === i ? v : x))))}<button type="button" className="btn btn-sm btn-danger" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 aria-hidden size={14} /></button></div>)}
      <button type="button" className="btn btn-sm btn-outline justify-self-start" onClick={() => onChange([...items, structuredClone(empty)])}><Plus aria-hidden size={14} />Add</button>
    </fieldset>
  );
}

function FieldsEditor({ title, fields, scope, onChange }: { title: string; fields: FieldDef[]; scope: FieldDef["scope"]; onChange: (x: FieldDef[]) => void }) {
  return (
    <section className="panel p-5 grid gap-3">
      <h2 className="text-lg">{title}</h2>
      {fields.map((f, i) => {
        const up = (p: Partial<FieldDef>) => onChange(fields.map((x, j) => (j === i ? { ...x, ...p } : x)));
        return (
          <div key={i} className="grid gap-2 border border-[var(--color-line)] rounded-[var(--radius-field)] p-3">
            <div className="grid sm:grid-cols-[1fr_1fr_10rem] gap-2">
              <input className="input" placeholder="Label (English)" value={f.label.en} onChange={(e) => up({ label: { ...f.label, en: e.target.value } })} />
              <input className="input" placeholder="हिंदी" value={f.label.hi ?? ""} onChange={(e) => up({ label: { ...f.label, hi: e.target.value } })} />
              <select className="input" value={f.type} onChange={(e) => up({ type: e.target.value as FieldDef["type"] })}>{["text", "textarea", "number", "select", "multiselect", "boolean", "date"].map((x) => <option key={x}>{x}</option>)}</select>
            </div>
            {(f.type === "select" || f.type === "multiselect") && <label className="field"><span className="text-sm">Options — one per line as value|English|हिंदी</span><textarea className="input font-mono text-sm" value={(f.options ?? []).map((o) => `${o.value}|${o.label.en}|${o.label.hi ?? ""}`).join("\n")} onChange={(e) => up({ options: e.target.value.split("\n").filter(Boolean).map((l) => { const [value, en, hi] = l.split("|"); return { value: value.trim(), label: { en: (en ?? value).trim(), hi: hi?.trim() || undefined } }; }) })} /></label>}
            <div className="flex flex-wrap gap-4 items-center">
              <input className="input max-w-48" placeholder="key (auto)" value={f.key} onChange={(e) => up({ key: e.target.value })} />
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.required} onChange={(e) => up({ required: e.target.checked })} />Required</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.private} onChange={(e) => up({ private: e.target.checked })} />Private (never shown publicly)</label>
              <button type="button" className="btn btn-sm btn-danger ml-auto" onClick={() => onChange(fields.filter((_, j) => j !== i))}>Remove</button>
            </div>
          </div>
        );
      })}
      <button type="button" className="btn btn-sm btn-outline justify-self-start" onClick={() => onChange([...fields, { key: "", label: { en: "" }, type: "text", scope }])}><Plus aria-hidden size={14} />Add question</button>
    </section>
  );
}
