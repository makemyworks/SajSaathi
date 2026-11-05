import { inr, dateTime } from "@/lib/shared/format";
import type { AdminFieldType } from "@/lib/core/admin-resources";

export function get(o: unknown, path: string): unknown { return path.split(".").reduce<unknown>((x, k) => (x as Record<string, unknown> | undefined)?.[k], o); }
export function Value({ v, type }: { v: unknown; type?: AdminFieldType }) {
  if (v === undefined || v === null || v === "") return <span className="muted">—</span>;
  if (type === "money") return <span className="tabular-nums">{inr(Number(v))}</span>;
  if (type === "datetime" || type === "date") return <span className="whitespace-nowrap">{dateTime(String(v))}</span>;
  if (type === "boolean" || typeof v === "boolean") return v ? <span className="badge badge-ok">Yes</span> : <span className="badge">No</span>;
  if (typeof v === "object") return <span className="text-sm">{Array.isArray(v) ? v.join(", ") : (v as Record<string, string>).en ?? JSON.stringify(v).slice(0, 60)}</span>;
  return <span>{String(v).length > 80 ? String(v).slice(0, 80) + "…" : String(v)}</span>;
}
