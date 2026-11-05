"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useData } from "@/lib/client";
import { dateTime } from "@/lib/shared/format";
import { Empty, Spinner, StatusBadge } from "@/lib/shared/ui";

type Row = { id: string; name: string; kind: string; city: string; status: string; updatedAt: string };
const TABS = ["", "submitted", "under_review", "documents_required"];
function List() {
  const sp = useSearchParams();
  const status = sp.get("status") ?? "";
  const { data } = useData<{ applications: Row[] }>(`admin/applications${status ? `?status=${status}` : ""}`);
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl">{status === "under_review" ? "Verification" : "Partner applications"}</h1>
      <nav className="flex gap-2 flex-wrap">{TABS.map((s) => <Link key={s} className="chip" aria-current={s === status ? "page" : undefined} href={`/admin/applications${s ? `?status=${s}` : ""}`}>{s ? s.replace(/_/g, " ") : "All waiting"}</Link>)}</nav>
      {!data ? <Spinner label="Loading…" /> : data.applications.length === 0 ? <Empty title="No applications waiting" /> : (
        <div className="panel overflow-x-auto"><table className="w-full text-left"><thead className="bg-[var(--color-ivory)]"><tr className="[&_th]:p-3"><th>Name</th><th>Type</th><th>City</th><th>Status</th><th>Waiting since</th></tr></thead>
          <tbody className="divide-y divide-[var(--color-line)]">{data.applications.map((a) => <tr key={a.id} className="[&_td]:p-3"><td><Link className="font-semibold underline-offset-4 hover:underline" href={`/admin/applications/${a.id}`}>{a.name}</Link></td><td>{a.kind}</td><td>{a.city || "—"}</td><td><StatusBadge status={a.status} /></td><td>{dateTime(a.updatedAt)}</td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}
export default function Page() { return <Suspense><List /></Suspense>; }
