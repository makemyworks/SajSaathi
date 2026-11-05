"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useData } from "@/lib/client";
import { Empty, Notice, Spinner } from "@/lib/shared/ui";
import { useAdmin } from "@/components/Admin";
import { get, Value } from "@/components/Value";

/** Generic, permission-aware list for any registry section (customers, coupons, cities, audit log, …). */
export default function ResourceList() {
  const { key } = useParams() as { key: string };
  const { resource } = useAdmin();
  const r = resource(key);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page), ...(q ? { q } : {}), ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v).map(([k, v]) => [`f_${k}`, v])) });
  const { data, error } = useData<{ rows: Record<string, unknown>[]; total: number; limit: number }>(r ? `admin/resources/${key}?${qs}` : null);
  if (!r) return <Notice tone="warn">This section is not available for your role.</Notice>;
  const rowHref = (row: Record<string, unknown>) => key === "bookings" || key === "cancellations" ? `/admin/bookings/${row._id}` : key === "tickets" || key === "complaints" ? `/admin/tickets/${row._id}` : ["partners", "professionals", "approvals", "rejections", "suspensions"].includes(key) ? `/admin/applications/${row._id}` : `/admin/r/${key}/${row._id}`;
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3 flex-wrap"><h1 className="text-2xl mr-auto">{r.label}</h1>{r.canCreate && r.canManage && <Link className="btn btn-primary btn-sm" href={`/admin/r/${key}/new`}><Plus aria-hidden size={16} />Add</Link>}</div>
      {r.note && <p className="muted max-w-[80ch]">{r.note}</p>}
      <form className="flex flex-wrap gap-2 items-end" onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(String(new FormData(e.currentTarget).get("q") ?? "")); }}>
        {r.search?.length ? <label className="field"><span className="sr-only">Search</span><span className="flex gap-2"><input name="q" className="input w-64" placeholder={`Search ${r.search.join(", ")}`} defaultValue={q} /><button className="btn btn-outline" aria-label="Search"><Search aria-hidden size={16} /></button></span></label> : null}
        {r.filters?.map((f) => <label key={f.key} className="field"><span className="text-sm">{f.label}</span><select className="input" value={filters[f.key] ?? ""} onChange={(e) => { setPage(1); setFilters({ ...filters, [f.key]: e.target.value }); }}><option value="">All</option>{f.options.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}</select></label>)}
      </form>
      {error && <Notice tone="bad">{error}</Notice>}
      {!data ? <Spinner label="Loading…" /> : data.rows.length === 0 ? <Empty title="Nothing here yet" /> : (
        <>
          <div className="panel overflow-x-auto"><table className="w-full text-left text-[0.95rem]">
            <thead className="bg-[var(--color-ivory)]"><tr className="[&_th]:p-3 [&_th]:font-semibold">{r.columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody className="divide-y divide-[var(--color-line)]">{data.rows.map((row) => <tr key={String(row._id)} className="[&_td]:p-3 hover:bg-[var(--color-teal-50)] cursor-pointer" onClick={() => router.push(rowHref(row))}>{r.columns.map((c, i) => <td key={c.key}>{i === 0 ? <Link href={rowHref(row)} className="font-semibold underline-offset-4 hover:underline"><Value v={get(row, c.key)} type={c.type} /></Link> : <Value v={get(row, c.key)} type={c.type} />}</td>)}</tr>)}</tbody>
          </table></div>
          <div className="flex items-center gap-3"><span className="muted">{data.total} total</span><button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span className="tabular-nums">Page {page}</span><button className="btn btn-sm btn-outline" disabled={page * data.limit >= data.total} onClick={() => setPage(page + 1)}>Next</button></div>
        </>
      )}
    </div>
  );
}
