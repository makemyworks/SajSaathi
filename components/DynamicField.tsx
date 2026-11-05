"use client";
import type { FieldDef } from "@/lib/core/types";
import { useI18n } from "./I18n";

/** Renders an admin-defined custom field (category booking fields, onboarding fields). */
export function DynamicField({ f, value, onChange, idPrefix = "f" }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void; idPrefix?: string }) {
  const { pick, t } = useI18n();
  const id = `${idPrefix}-${f.key}`;
  const label = <span>{pick(f.label)}{!f.required && f.type !== "boolean" ? <span className="muted font-normal"> ({t.common.optional})</span> : null}</span>;
  const help = f.help ? <small>{pick(f.help)}</small> : null;
  switch (f.type) {
    case "textarea":
      return <label className="field" htmlFor={id}>{label}<textarea id={id} className="input" required={f.required} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} maxLength={1000} />{help}</label>;
    case "number":
      return <label className="field" htmlFor={id}>{label}<input id={id} className="input" type="number" inputMode="numeric" min={f.min} max={f.max} required={f.required} value={value === undefined ? "" : String(value)} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />{help}</label>;
    case "date":
      return <label className="field" htmlFor={id}>{label}<input id={id} className="input" type="date" required={f.required} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />{help}</label>;
    case "select":
      return (
        <label className="field" htmlFor={id}>{label}
          <select id={id} className="input" required={f.required} value={String(value ?? "")} onChange={(e) => onChange(e.target.value || undefined)}>
            <option value="">—</option>
            {f.options?.map((o) => <option key={o.value} value={o.value}>{pick(o.label)}</option>)}
          </select>{help}
        </label>
      );
    case "multiselect": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <fieldset className="field"><legend className="font-semibold text-[0.95rem] mb-1">{pick(f.label)}</legend>
          <div className="flex flex-wrap gap-2">
            {f.options?.map((o) => { const on = arr.includes(o.value); return (
              <button key={o.value} type="button" className="chip" aria-pressed={on} onClick={() => onChange(on ? arr.filter((x) => x !== o.value) : [...arr, o.value])}>{pick(o.label)}</button>
            ); })}
          </div>{help}
        </fieldset>
      );
    }
    case "boolean":
      return <label className="flex items-start gap-3 py-1" htmlFor={id}><input id={id} type="checkbox" className="size-5 mt-1 accent-[var(--color-teal-800)]" checked={!!value} onChange={(e) => onChange(e.target.checked)} /><span>{pick(f.label)}{help && <span className="block">{help}</span>}</span></label>;
    default:
      return <label className="field" htmlFor={id}>{label}<input id={id} className="input" required={f.required} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} maxLength={200} />{help}</label>;
  }
}
