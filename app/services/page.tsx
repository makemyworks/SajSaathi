"use client";
import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import type { Service, Staff } from "@/lib/core/types";
import { api, useData } from "@/lib/client";
import { inr } from "@/lib/shared/format";
import { Empty, LoadFailure, Notice, Spinner } from "@/lib/shared/ui";
import { usePartner } from "@/components/Partner";
import { Field } from "@/components/Field";

export default function ServicesPage() {
  const { t, locale, has } = usePartner();
  const { data, error, reload } = useData<{ services: Service[] }>("partner/services");
  const staff = useData<{ staff: Staff[] }>(has("staff") ? "partner/staff" : null).data?.staff ?? [];
  const [edit, setEdit] = useState<Partial<Service> | null>(null);
  if (!data) return error ? <LoadFailure message={error} onRetry={reload} /> : <Spinner label={t.common.loading} />;
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3"><h1 className="text-2xl mr-auto">{t.services.title}</h1><button className="btn btn-primary btn-sm" onClick={() => setEdit({ name: "", durationMin: 30, pricePaise: 0, mode: "in_store", addOns: [], staffIds: [], active: true })}><Plus aria-hidden size={18} />{t.services.add}</button></div>
      {edit && <ServiceForm s={edit} staff={staff} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
      {data.services.length === 0 && !edit ? <Empty title={t.services.empty} /> : (
        <ul className="panel divide-y divide-[var(--color-line)]">
          {data.services.map((s) => (
            <li key={s._id} className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0"><p className="font-semibold">{s.name}{!s.active && <span className="badge ml-2">{t.services.hidden}</span>}</p><p className="muted text-[0.95rem]">{s.durationMin} min · {s.mode === "both" ? t.services.both : s.mode === "at_home" ? t.services.atHome : t.services.inStore}{s.addOns.length ? ` · +${s.addOns.length}` : ""}</p></div>
              <strong className="tabular-nums">{inr(s.pricePaise, locale)}</strong>
              <button className="btn btn-sm btn-outline" aria-label={t.services.edit} onClick={() => setEdit(s)}><Pencil aria-hidden size={16} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ServiceForm({ s: init, staff, onClose, onSaved }: { s: Partial<Service>; staff: Staff[]; onClose: () => void; onSaved: () => void }) {
  const { t, app, has } = usePartner();
  const cat = app?.category;
  const [s, setS] = useState<Partial<Service>>({ ...init, addOns: init.addOns ?? [] });
  const [rupees, setRupees] = useState(init.pricePaise ? String(init.pricePaise / 100) : "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true); setErr("");
    const body = { ...s, pricePaise: Math.round(Number(rupees || 0) * 100) };
    try { if (s._id) await api(`partner/services/${s._id}`, "PATCH", body); else await api("partner/services", "POST", body); onSaved(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <form className="panel p-5 grid gap-4 border-[var(--color-teal-700)]" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <label className="field"><span>{t.services.name}</span><input className="input" required value={s.name ?? ""} onChange={(e) => setS({ ...s, name: e.target.value })} /></label>
      <label className="field"><span>{t.services.description}</span><textarea className="input" value={s.description ?? ""} onChange={(e) => setS({ ...s, description: e.target.value })} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="field"><span>{t.services.duration}</span><input className="input" inputMode="numeric" required value={String(s.durationMin ?? "")} onChange={(e) => setS({ ...s, durationMin: Number(e.target.value.replace(/\D/g, "")) })} /></label>
        <label className="field"><span>{t.services.price}</span><input className="input" inputMode="decimal" required value={rupees} onChange={(e) => setRupees(e.target.value.replace(/[^\d.]/g, ""))} /></label>
      </div>
      {cat?.atHomeAllowed && (
        <fieldset className="field"><legend className="font-semibold text-[0.95rem] mb-1">{t.services.mode}</legend>
          <div className="flex flex-wrap gap-2">{(["in_store", "at_home", "both"] as const).map((m) => <button type="button" key={m} className="chip" aria-pressed={s.mode === m} onClick={() => setS({ ...s, mode: m })}>{m === "both" ? t.services.both : m === "at_home" ? t.services.atHome : t.services.inStore}</button>)}</div>
        </fieldset>
      )}
      <fieldset className="grid gap-2"><legend className="font-semibold mb-1">{t.services.addOns}</legend>
        {s.addOns!.map((a, i) => (
          <div key={a.id || i} className="grid grid-cols-[1fr_6rem_5rem_auto] gap-2 items-end">
            <label className="field"><span className="sr-only">{t.services.addOnName}</span><input className="input" placeholder={t.services.addOnName} value={a.name} onChange={(e) => { const x = [...s.addOns!]; x[i] = { ...a, name: e.target.value }; setS({ ...s, addOns: x }); }} /></label>
            <input className="input" inputMode="decimal" aria-label="₹" placeholder="₹" value={a.pricePaise ? String(a.pricePaise / 100) : ""} onChange={(e) => { const x = [...s.addOns!]; x[i] = { ...a, pricePaise: Math.round(Number(e.target.value || 0) * 100) }; setS({ ...s, addOns: x }); }} />
            <input className="input" inputMode="numeric" aria-label="min" placeholder="min" value={a.durationMin ? String(a.durationMin) : ""} onChange={(e) => { const x = [...s.addOns!]; x[i] = { ...a, durationMin: Number(e.target.value || 0) }; setS({ ...s, addOns: x }); }} />
            <button type="button" className="btn btn-sm btn-danger" aria-label={t.services.remove} onClick={() => setS({ ...s, addOns: s.addOns!.filter((_, j) => j !== i) })}><Trash2 aria-hidden size={16} /></button>
          </div>
        ))}
        <button type="button" className="btn btn-sm btn-outline justify-self-start" onClick={() => setS({ ...s, addOns: [...s.addOns!, { id: "", name: "", pricePaise: 0, durationMin: 0 }] })}><Plus aria-hidden size={16} />{t.services.addAddOn}</button>
      </fieldset>
      {has("packages") && <>
        <label className="flex items-center gap-3"><input type="checkbox" className="size-6 accent-[var(--color-teal-800)]" checked={!!s.isPackage} onChange={(e) => setS({ ...s, isPackage: e.target.checked })} />{t.services.package}</label>
        {s.isPackage && <label className="field"><span>{t.services.packageItems}</span><textarea className="input" value={(s.packageItems ?? []).join("\n")} onChange={(e) => setS({ ...s, packageItems: e.target.value.split("\n").filter(Boolean) })} /></label>}
      </>}
      <label className="field"><span>{t.services.eligibility}</span><input className="input" value={s.eligibility ?? ""} onChange={(e) => setS({ ...s, eligibility: e.target.value })} /></label>
      {cat?.serviceFields.map((f) => <Field key={f.key} f={f} value={s.fieldValues?.[f.key]} onChange={(v) => setS({ ...s, fieldValues: { ...(s.fieldValues ?? {}), [f.key]: v } })} />)}
      {staff.length > 0 && (
        <fieldset className="field"><legend className="font-semibold text-[0.95rem] mb-1">{t.services.staff}</legend>
          <div className="flex flex-wrap gap-2">{staff.map((m) => { const on = s.staffIds?.includes(m._id); return <button type="button" key={m._id} className="chip" aria-pressed={!!on} onClick={() => setS({ ...s, staffIds: on ? s.staffIds!.filter((x) => x !== m._id) : [...(s.staffIds ?? []), m._id] })}>{m.name}</button>; })}</div>
        </fieldset>
      )}
      <label className="flex items-center gap-3"><input type="checkbox" className="size-6 accent-[var(--color-teal-800)]" checked={s.active !== false} onChange={(e) => setS({ ...s, active: e.target.checked })} />{t.services.active}</label>
      {err && <Notice tone="bad">{err}</Notice>}
      <div className="flex gap-2 flex-wrap">
        <button className="btn btn-primary" disabled={busy}>{t.services.save}</button>
        <button type="button" className="btn btn-outline" onClick={onClose}>{t.common.close}</button>
        {s._id && <button type="button" className="btn btn-danger ml-auto" onClick={async () => { await api(`partner/services/${s._id}`, "DELETE"); onSaved(); }}>{t.services.remove}</button>}
      </div>
    </form>
  );
}
