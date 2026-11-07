import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { statusTone } from "./format";

export function Stars({ value, count, label }: { value: number; count?: number; label?: string }) {
  if (!count) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[0.95rem]" aria-label={`${value} out of 5${label ? `, ${label}` : ""}`}>
      <Star aria-hidden size={16} className="fill-[var(--color-gold)] text-[var(--color-gold)]" />
      <strong>{value.toFixed(1)}</strong>
      {label && <span className="muted">({label})</span>}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className={`badge ${statusTone[status] ?? ""}`}>{label ?? status.replace(/_/g, " ")}</span>;
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="panel p-6 sm:p-8 text-center grid gap-3 justify-items-center">
      <svg aria-hidden width="40" height="40" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="var(--color-teal-50)" /><path d="M22 34c4 5 16 5 20 0" stroke="var(--color-teal-700)" strokeWidth="3" fill="none" strokeLinecap="round" /><circle cx="25" cy="26" r="2.5" fill="var(--color-teal-700)" /><circle cx="39" cy="26" r="2.5" fill="var(--color-teal-700)" /></svg>
      <p className="font-semibold text-lg">{title}</p>
      {body && <p className="muted max-w-[48ch]">{body}</p>}
      {action}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "bad" | "ok"; children: ReactNode }) {
  const cls = { info: "bg-[var(--color-teal-50)] border-[var(--color-teal-100)]", warn: "bg-[#fbf3e2] border-[#efd9a6]", bad: "bg-[#fbe9e7] border-[#f0c8c4]", ok: "bg-[#e8f3ec] border-[#c4e0cf]" }[tone];
  return <div role={tone === "bad" ? "alert" : "status"} className={`rounded-[var(--radius-field)] border px-4 py-3 ${cls}`}>{children}</div>;
}

export function Spinner({ label }: { label: string }) {
  return <span role="status" className="inline-flex items-center gap-2 muted"><span aria-hidden className="size-4 rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-teal-700)] animate-spin" />{label}</span>;
}

export function LoadFailure({ message, onRetry, title = "This information could not be loaded." }: { message: string; onRetry?: () => void; title?: string }) {
  return (
    <div className="grid gap-3">
      <Notice tone="bad">
        <div className="grid gap-1"><strong>{title}</strong><p>{message}</p></div>
      </Notice>
      {onRetry && <button type="button" className="btn btn-outline justify-self-start" onClick={onRetry}>Try again</button>}
    </div>
  );
}
