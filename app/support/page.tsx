"use client";
import { useState } from "react";
import { api, useData } from "@/lib/client";
import { dateTime } from "@/lib/shared/format";
import { LoadFailure, Notice } from "@/lib/shared/ui";
import { usePartner } from "@/components/Partner";

type Ticket = { _id: string; ref: string; subject: string; status: string; messages: { byRole: string; text: string; at: string }[] };
export default function SupportPage() {
  const { t, locale } = usePartner();
  const { data, error, reload } = useData<{ tickets: Ticket[] }>("me/tickets");
  const [msg, setMsg] = useState("");
  return (
    <div className="grid gap-4"><h1 className="text-2xl">{t.nav.support}</h1>
      <form className="panel p-4 grid gap-3" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const form = e.currentTarget; try { await api("me/tickets", "POST", { category: f.get("category"), subject: f.get("subject"), text: f.get("text") }); form.reset(); setMsg(t.common.saved); reload(); } catch (x) { setMsg((x as Error).message); } }}>
        <select name="category" className="input" aria-label="Type"><option value="partner">Partner account / payouts</option><option value="booking">Booking</option><option value="safety">Safety concern</option><option value="other">Other</option></select>
        <input name="subject" className="input" required minLength={3} placeholder="Subject" />
        <textarea name="text" className="input" required minLength={5} />
        <button className="btn btn-primary justify-self-start">Send</button>
        {msg && <Notice>{msg}</Notice>}
      </form>
      {error && !data && <LoadFailure message={error} onRetry={reload} />}
      <ul className="grid gap-3">{data?.tickets.map((x) => <li key={x._id} className="panel p-4 grid gap-2"><p className="font-semibold">{x.subject} <span className="badge ml-2">{x.status}</span> <span className="muted text-sm">{x.ref}</span></p>{x.messages.map((m, i) => <p key={i} className={`p-2 rounded-lg ${m.byRole === "admin" ? "bg-[var(--color-teal-50)]" : "bg-[var(--color-ivory)]"}`}><span className="muted text-sm block">{m.byRole === "admin" ? "Saj Saathi" : "You"} · {dateTime(m.at, locale)}</span>{m.text}</p>)}<form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; await api(`me/tickets/${x._id}`, "POST", { text: new FormData(form).get("text") }); form.reset(); reload(); }}><input name="text" className="input" required /><button className="btn btn-outline">Send</button></form></li>)}</ul>
    </div>
  );
}
