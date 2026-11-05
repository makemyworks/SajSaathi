"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FileText } from "lucide-react";
import type { Category, DocumentRecord, Provider, Service } from "@/lib/core/types";
import { api, useData } from "@/lib/client";
import { dateTime, inr } from "@/lib/shared/format";
import { Notice, Spinner, StatusBadge } from "@/lib/shared/ui";
import { useAdmin } from "@/components/Admin";

type D = { provider: Provider; owner: { name: string; email?: string; phone?: string; createdAt: string } | null; categories: Category[]; documents: Omit<DocumentRecord, "storageKey">[]; services: Service[]; checklist: { missing: string[]; complete: boolean } };
const NEXT: Record<string, { to: string; label: string; tone: string; note?: boolean }[]> = {
  submitted: [{ to: "under_review", label: "Start review", tone: "btn-outline" }, { to: "approved", label: "Approve", tone: "btn-primary" }, { to: "documents_required", label: "Ask for documents", tone: "btn-outline", note: true }, { to: "rejected", label: "Reject", tone: "btn-danger", note: true }],
  under_review: [{ to: "approved", label: "Approve", tone: "btn-primary" }, { to: "documents_required", label: "Ask for documents", tone: "btn-outline", note: true }, { to: "rejected", label: "Reject", tone: "btn-danger", note: true }],
  documents_required: [{ to: "under_review", label: "Resume review", tone: "btn-outline" }, { to: "rejected", label: "Reject", tone: "btn-danger", note: true }],
  approved: [{ to: "suspended", label: "Suspend", tone: "btn-danger", note: true }],
  rejected: [{ to: "under_review", label: "Re-open review", tone: "btn-outline" }],
  suspended: [{ to: "approved", label: "Reinstate", tone: "btn-primary" }, { to: "rejected", label: "Reject permanently", tone: "btn-danger", note: true }],
  draft: [],
};

export default function ApplicationReview() {
  const { id } = useParams() as { id: string };
  const { can } = useAdmin();
  const { data, reload } = useData<D>(`admin/applications/${id}`);
  const [pending, setPending] = useState<{ to: string; note?: boolean } | null>(null);
  const [err, setErr] = useState("");
  if (!data) return <Spinner label="Loading…" />;
  const p = data.provider; const cat = data.categories[0];
  const decide = async (to: string, note?: string) => { setErr(""); try { await api(`admin/applications/${id}/decision`, "POST", { status: to, note }); setPending(null); reload(); } catch (e) { setErr((e as Error).message); } };
  const label = (key: string) => cat?.onboardingFields.find((f) => f.key === key)?.label.en ?? key;
  return (
    <div className="grid gap-5 max-w-5xl">
      <Link className="muted underline" href="/admin/applications">← Applications</Link>
      <div className="flex items-start gap-3 flex-wrap"><h1 className="text-2xl mr-auto">{p.businessName}</h1><StatusBadge status={p.status} /></div>
      {p.statusNote && <Notice>Last note to partner: {p.statusNote}</Notice>}
      {!data.checklist.complete && <Notice tone="warn">Incomplete: {data.checklist.missing.join(", ")}</Notice>}
      {can("applications.review") && (
        <section className="panel p-4 grid gap-3">
          <div className="flex gap-2 flex-wrap">{(NEXT[p.status] ?? []).map((a) => <button key={a.to} className={`btn ${a.tone}`} onClick={() => (a.note ? setPending(a) : decide(a.to))}>{a.label}</button>)}</div>
          {pending && <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); decide(pending.to, String(new FormData(e.currentTarget).get("note") ?? "")); }}><label className="field"><span>Message to the partner (required)</span><textarea name="note" className="input" required minLength={5} /></label><div className="flex gap-2"><button className="btn btn-primary">Send decision</button><button type="button" className="btn btn-outline" onClick={() => setPending(null)}>Cancel</button></div></form>}
          {err && <Notice tone="bad">{err}</Notice>}
        </section>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <section className="panel p-4 grid gap-1"><h2 className="text-lg">Business</h2>
          <p>{p.kind} · {data.categories.map((c) => c.name.en).join(", ")}</p>
          <p>{[p.address.line1, p.address.locality, p.address.city, p.address.state, p.address.pin].filter(Boolean).join(", ") || "—"}</p>
          <p>Phone {p.phone}{p.email ? ` · ${p.email}` : ""}</p>
          <p>{p.inStore ? "In-store" : ""}{p.inStore && p.atHome ? " + " : ""}{p.atHome ? `Home visits (${p.serviceArea?.pins.join(", ") || "no PINs"}; travel ${inr(p.travelFeePaise ?? 0)})` : ""}</p>
          {p.about && <p className="muted mt-2 whitespace-pre-line">{p.about}</p>}
          <p className="muted text-sm mt-2">Agreement: {p.agreementAcceptedAt ? dateTime(p.agreementAcceptedAt) : "not accepted"}</p>
        </section>
        <section className="panel p-4 grid gap-1"><h2 className="text-lg">Owner</h2>{data.owner ? <><p>{data.owner.name}</p><p>{data.owner.phone ?? "—"} · {data.owner.email ?? "—"}</p><p className="muted text-sm">Account since {dateTime(data.owner.createdAt)}</p></> : <p>—</p>}</section>
      </div>
      <section className="panel p-4 grid gap-2"><h2 className="text-lg">Answers ({cat?.name.en})</h2>
        <dl className="grid sm:grid-cols-[minmax(12rem,auto)_1fr] gap-x-4 gap-y-1">{Object.entries(p.onboardingAnswers).map(([k, v]) => <div key={k} className="contents"><dt className="muted">{label(k)}</dt><dd>{Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}</dd></div>)}</dl>
      </section>
      <section className="panel p-4 grid gap-2"><h2 className="text-lg">Documents (private)</h2>
        {data.documents.length === 0 ? <p className="muted">No documents uploaded.</p> : <ul className="grid gap-2">{data.documents.map((d) => (
          <li key={d._id} className="flex items-center gap-3 flex-wrap"><FileText aria-hidden size={18} /><span className="flex-1">{d.kind.replace(/_/g, " ")} — {d.fileName} <span className="muted text-sm">({Math.round(d.sizeBytes / 1024)} KB, {dateTime(d.createdAt)})</span></span><StatusBadge status={d.status} />
            {can("documents.view") && <a className="btn btn-sm btn-outline" href={`/api/admin-proxy?path=${encodeURIComponent(`admin/documents/${d._id}`)}`} target="_blank" rel="noreferrer">Open</a>}
            {can("applications.review") && <><button className="btn btn-sm btn-outline" onClick={async () => { await api(`admin/resources/documents/${d._id}`, "PATCH", { status: "accepted" }); reload(); }}>Accept</button><button className="btn btn-sm btn-danger" onClick={async () => { await api(`admin/resources/documents/${d._id}`, "PATCH", { status: "rejected" }); reload(); }}>Reject</button></>}
          </li>
        ))}</ul>}
        <p className="muted text-sm">Opening a document is recorded in the audit log.</p>
        {cat?.requiredCredentials.length ? <p className="text-[0.95rem]">Required for this category: {cat.requiredCredentials.map((c) => `${c.label.en}${c.mandatory ? " *" : ""}`).join("; ")}</p> : null}
      </section>
      <section className="panel p-4 grid gap-2"><h2 className="text-lg">Services ({data.services.length})</h2>
        <ul className="grid gap-1">{data.services.map((s) => <li key={s._id} className="flex gap-3"><span className="flex-1">{s.name} {s.description && <span className="muted">— {s.description.slice(0, 80)}</span>}</span><span>{s.durationMin} min</span><span className="tabular-nums">{inr(s.pricePaise)}</span></li>)}</ul>
      </section>
      {p.gallery.length > 0 && <section className="panel p-4 grid gap-2"><h2 className="text-lg">Photos</h2><ul className="grid grid-cols-4 gap-2">{p.gallery.map((g) => <li key={g.url}><img src={`/api/admin-proxy?path=${encodeURIComponent(g.url.split("/api/v1/").pop() ?? "")}`} alt={g.caption ?? ""} className="aspect-square object-cover rounded-lg" /></li>)}</ul></section>}
    </div>
  );
}
