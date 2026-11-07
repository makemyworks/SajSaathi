"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import type { Service, Staff } from "@/lib/core/types";
import { api, useData } from "@/lib/client";
import { Empty, LoadFailure, Notice, Spinner } from "@/lib/shared/ui";
import { usePartner } from "@/components/Partner";

export default function StaffPage() {
  const { t } = usePartner();
  const { data, error, reload } = useData<{ staff: Staff[] }>("partner/staff");
  const services = useData<{ services: Service[] }>("partner/services").data?.services ?? [];
  const [edit, setEdit] = useState<Partial<Staff> | null>(null);
  const [err, setErr] = useState("");
  if (!data) return error ? <LoadFailure message={error} onRetry={reload} /> : <Spinner label={t.common.loading} />;
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3"><h1 className="text-2xl mr-auto">{t.staff.title}</h1><button className="btn btn-primary btn-sm" onClick={() => setEdit({ name: "", role: "", serviceIds: [], active: true })}><Plus aria-hidden size={18} />{t.staff.add}</button></div>
      {edit && (
        <form className="panel p-5 grid gap-3" onSubmit={async (e) => { e.preventDefault(); setErr(""); try { if (edit._id) await api(`partner/staff/${edit._id}`, "PATCH", edit); else await api("partner/staff", "POST", edit); setEdit(null); reload(); } catch (x) { setErr((x as Error).message); } }}>
          <label className="field"><span>{t.staff.name}</span><input className="input" required value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
          <label className="field"><span>{t.staff.role}</span><input className="input" value={edit.role ?? ""} onChange={(e) => setEdit({ ...edit, role: e.target.value })} /></label>
          <fieldset className="field"><legend className="font-semibold text-[0.95rem] mb-1">{t.staff.services}</legend><div className="flex flex-wrap gap-2">{services.map((s) => { const on = edit.serviceIds?.includes(s._id); return <button type="button" key={s._id} className="chip" aria-pressed={!!on} onClick={() => setEdit({ ...edit, serviceIds: on ? edit.serviceIds!.filter((x) => x !== s._id) : [...(edit.serviceIds ?? []), s._id] })}>{s.name}</button>; })}</div></fieldset>
          <label className="flex items-center gap-3"><input type="checkbox" className="size-6 accent-[var(--color-teal-800)]" checked={edit.active !== false} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />{t.staff.active}</label>
          {err && <Notice tone="bad">{err}</Notice>}
          <div className="flex gap-2"><button className="btn btn-primary">{t.staff.save}</button><button type="button" className="btn btn-outline" onClick={() => setEdit(null)}>{t.common.close}</button></div>
        </form>
      )}
      {data.staff.length === 0 && !edit ? <Empty title={t.staff.empty} /> : (
        <ul className="panel divide-y divide-[var(--color-line)]">{data.staff.map((s) => <li key={s._id}><button className="w-full text-left p-4 flex gap-3 items-center" onClick={() => setEdit(s)}><span className="flex-1"><span className="font-semibold block">{s.name}</span><span className="muted">{s.role}</span></span>{!s.active && <span className="badge">off</span>}</button></li>)}</ul>
      )}
    </div>
  );
}
