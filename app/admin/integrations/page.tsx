"use client";
import { useData } from "@/lib/client";
import { Spinner } from "@/lib/shared/ui";
type I = { key: string; name: string; active: boolean; needs: string[] };
export default function Integrations() {
  const { data } = useData<{ integrations: I[] }>("admin/integrations");
  if (!data) return <Spinner label="Loading…" />;
  return (
    <div className="grid gap-4 max-w-3xl">
      <h1 className="text-2xl">Integrations</h1>
      <p className="muted">Status comes from the API server&apos;s environment variables. Secrets are never shown. Inactive integrations are skipped and recorded as "not configured" — nothing is reported as sent or paid.</p>
      <ul className="panel divide-y divide-[var(--color-line)]">{data.integrations.map((i) => <li key={i.key} className="p-4 grid gap-1"><div className="flex gap-3 items-center"><span className="font-semibold flex-1">{i.name}</span><span className={`badge ${i.active ? "badge-ok" : "badge-warn"}`}>{i.active ? "Active" : "Inactive"}</span></div>{!i.active && <p className="muted text-[0.95rem]">Set on the customer/API Vercel project: <code className="text-sm">{i.needs.join(", ")}</code></p>}</li>)}</ul>
    </div>
  );
}
