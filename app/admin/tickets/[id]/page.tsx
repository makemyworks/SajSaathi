"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { SupportTicket } from "@/lib/core/types";
import { api, useData } from "@/lib/client";
import { dateTime } from "@/lib/shared/format";
import { Spinner, StatusBadge } from "@/lib/shared/ui";
export default function TicketPage() {
  const { id } = useParams() as { id: string };
  const { data, reload } = useData<{ ticket: SupportTicket }>(`admin/tickets/${id}`);
  if (!data) return <Spinner label="Loading…" />;
  const t = data.ticket;
  return (
    <div className="grid gap-4 max-w-3xl">
      <Link className="muted underline" href="/admin/r/tickets">← Tickets</Link>
      <div className="flex gap-3 items-start flex-wrap"><h1 className="text-2xl mr-auto">{t.subject}</h1><span className="badge">{t.category}</span><span className={`badge ${t.priority === "urgent" ? "badge-bad" : ""}`}>{t.priority}</span><StatusBadge status={t.status} /></div>
      <p className="muted">{t.ref} · from {t.role}{t.bookingId && <> · <Link className="underline" href={`/admin/bookings/${t.bookingId}`}>booking</Link></>}</p>
      <ul className="grid gap-2">{t.messages.map((m, i) => <li key={i} className={`panel p-3 ${m.byRole === "admin" ? "bg-[var(--color-teal-50)]" : ""}`}><p className="muted text-sm">{m.byRole === "admin" ? "Support" : m.byRole} · {dateTime(m.at)}</p><p className="whitespace-pre-line">{m.text}</p></li>)}</ul>
      <form className="panel p-4 grid gap-3" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const form = e.currentTarget; await api(`admin/tickets/${id}`, "POST", { text: f.get("text"), status: f.get("status") }); form.reset(); reload(); }}>
        <textarea name="text" className="input" required placeholder="Reply to the user" />
        <div className="flex gap-2 items-center"><label className="field"><span className="text-sm">Set status</span><select name="status" className="input" defaultValue="pending"><option value="pending">Waiting for user</option><option value="resolved">Resolved</option><option value="closed">Closed</option><option value="open">Open</option></select></label><button className="btn btn-primary ml-auto">Send reply</button></div>
      </form>
    </div>
  );
}
