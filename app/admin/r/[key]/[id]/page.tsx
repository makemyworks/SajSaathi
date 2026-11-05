"use client";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { AdminField } from "@/lib/core/admin-resources";
import { api, useData } from "@/lib/client";
import { Notice, Spinner } from "@/lib/shared/ui";
import { useAdmin } from "@/components/Admin";
import { get, Value } from "@/components/Value";

function toInput(f: AdminField, v: unknown): unknown {
  if (v === undefined || v === null) return f.type === "boolean" ? false : "";
  if (f.type === "datetime") return new Date(String(v)).toISOString().slice(0, 16);
  if (f.type === "date") return String(v).slice(0, 10);
  if (f.type === "money") return String(Number(v) / 100);
  if (f.type === "tags") return Array.isArray(v) ? v.join(", ") : String(v);
  if (f.type === "json") return JSON.stringify(v, null, 2);
  return v;
}
function fromInput(f: AdminField, v: unknown): unknown {
  if (f.type === "money") return v === "" ? "" : Math.round(Number(v) * 100);
  if (f.type === "datetime") return v ? new Date(String(v)).toISOString() : "";
  return v;
}

/** Generic edit/create screen driven by the registry's field list; the server re-validates every field. */
export default function ResourceEdit() {
  const { key, id } = useParams() as { key: string; id: string };
  const isNew = id === "new";
  const { resource } = useAdmin();
  const r = resource(key);
  const router = useRouter();
  const { data } = useData<{ row: Record<string, unknown> }>(r && !isNew ? `admin/resources/${key}/${id}` : null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  useEffect(() => { if (r) setForm(Object.fromEntries(r.fields.map((f) => [f.key, toInput(f, data ? get(data.row, f.key) : undefined)]))); }, [r, data]);
  if (!r) return <Notice tone="warn">Not available for your role.</Notice>;
  if (!isNew && !data) return <Spinner label="Loading…" />;
  const editable = r.canManage && r.fields.some((f) => !f.readOnly);
  const save = async () => {
    setMsg(null);
    const body = Object.fromEntries(r.fields.filter((f) => !f.readOnly).map((f) => [f.key, fromInput(f, form[f.key])]));
    try {
      if (isNew) { const j = await api<{ row: { _id: string } }>(`admin/resources/${key}`, "POST", body); router.push(`/admin/r/${key}/${j.row._id}`); }
      else { await api(`admin/resources/${key}/${id}`, "PATCH", body); setMsg({ tone: "ok", text: "Saved" }); }
    } catch (e) { setMsg({ tone: "bad", text: (e as Error).message }); }
  };
  return (
    <div className="grid gap-4 max-w-3xl">
      <Link href={`/admin/r/${key}`} className="muted underline">← {r.label}</Link>
      <h1 className="text-2xl">{isNew ? `New — ${r.label}` : String(get(data!.row, r.columns[0].key) ?? id)}</h1>
      {!isNew && (
        <details className="panel p-4"><summary className="cursor-pointer font-semibold">All recorded fields</summary>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[0.95rem]">{Object.entries(data!.row).filter(([k]) => !["passwordHash", "mfa", "storageKey"].includes(k)).map(([k, v]) => <Fragment key={k}><dt className="muted">{k}</dt><dd className="break-words"><Value v={typeof v === "object" && v !== null && !Array.isArray(v) && !("en" in (v as object)) ? JSON.stringify(v) : v} /></dd></Fragment>)}</dl>
        </details>
      )}
      {r.fields.length > 0 && (
        <form className="panel p-5 grid gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          {r.fields.map((f) => <FieldInput key={f.key} f={f} value={form[f.key]} disabled={!r.canManage || !!f.readOnly} onChange={(v) => setForm({ ...form, [f.key]: v })} />)}
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          {editable && <div className="flex gap-2"><button className="btn btn-primary">{isNew ? "Create" : "Save changes"}</button>{!isNew && r.canDelete && <button type="button" className="btn btn-danger ml-auto" onClick={async () => { if (confirm("Delete permanently?")) { await api(`admin/resources/${key}/${id}`, "DELETE"); router.push(`/admin/r/${key}`); } }}>Delete</button>}</div>}
        </form>
      )}
    </div>
  );
}

function FieldInput({ f, value, onChange, disabled }: { f: AdminField; value: unknown; onChange: (v: unknown) => void; disabled: boolean }) {
  const label = <span>{f.label}{f.required ? " *" : ""}</span>;
  const help = f.help ? <small>{f.help}</small> : null;
  if (f.type === "boolean") return <label className="flex items-center gap-3"><input type="checkbox" className="size-5 accent-[var(--color-teal-800)]" disabled={disabled} checked={!!value} onChange={(e) => onChange(e.target.checked)} />{f.label}{help}</label>;
  if (f.type === "select") return <label className="field">{label}<select className="input" disabled={disabled} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{f.options?.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}</select>{help}</label>;
  if (f.type === "textarea" || f.type === "json") return <label className="field">{label}<textarea className={`input ${f.type === "json" ? "font-mono text-sm min-h-40" : ""}`} disabled={disabled} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />{help ?? (f.type === "json" ? <small>JSON, e.g. {"{ \"title\": \"…\", \"body\": \"…\" }"}</small> : null)}</label>;
  if (f.type === "localized") {
    const v = (typeof value === "object" && value ? value : {}) as Record<string, string>;
    return <fieldset className="grid gap-2"><legend className="font-semibold text-[0.95rem]">{f.label}{f.required ? " *" : ""}</legend>
      <label className="field"><span className="text-sm">English</span><textarea className="input" disabled={disabled} value={v.en ?? ""} onChange={(e) => onChange({ ...v, en: e.target.value })} /></label>
      <label className="field"><span className="text-sm">हिंदी</span><textarea className="input" lang="hi" disabled={disabled} value={v.hi ?? ""} onChange={(e) => onChange({ ...v, hi: e.target.value })} /></label></fieldset>;
  }
  const type = f.type === "number" || f.type === "money" ? "number" : f.type === "datetime" ? "datetime-local" : f.type === "date" ? "date" : f.type === "email" ? "email" : f.type === "url" ? "url" : "text";
  return <label className="field">{label}<input className="input" type={type} step={f.type === "money" ? "0.01" : undefined} disabled={disabled} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />{help ?? (f.type === "money" ? <small>In rupees</small> : f.type === "tags" ? <small>Comma separated</small> : null)}</label>;
}
