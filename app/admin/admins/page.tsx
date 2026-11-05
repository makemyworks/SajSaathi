"use client";
import { useState } from "react";
import Link from "next/link";
import { api, useData } from "@/lib/client";
import { dateTime } from "@/lib/shared/format";
import { Notice, Spinner, StatusBadge } from "@/lib/shared/ui";

type Row = { _id: string; name: string; email: string; adminRole: string; status: string; lastLoginAt?: string };
export default function Admins() {
  const { data, reload } = useData<{ rows: Row[] }>("admin/resources/admins?limit=100");
  const [invite, setInvite] = useState<{ tempPassword: string } | null>(null);
  const [err, setErr] = useState("");
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl">Admin users</h1>
      <form className="panel p-4 grid sm:grid-cols-[1fr_1fr_12rem_auto] gap-2 items-end" onSubmit={async (e) => { e.preventDefault(); setErr(""); const f = new FormData(e.currentTarget); try { setInvite(await api("admin/admins", "POST", { name: f.get("name"), email: f.get("email"), adminRole: f.get("role") })); reload(); } catch (x) { setErr((x as Error).message); } }}>
        <label className="field"><span>Name</span><input name="name" className="input" required /></label>
        <label className="field"><span>Email</span><input name="email" type="email" className="input" required /></label>
        <label className="field"><span>Role</span><select name="role" className="input">{["operations", "finance", "support", "content", "verification", "super_admin"].map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}</select></label>
        <button className="btn btn-primary">Invite admin</button>
      </form>
      {invite && <Notice tone="warn">Temporary password (shown once): <strong className="tabular-nums select-all">{invite.tempPassword}</strong>. Share it privately; ask them to change it and turn on MFA at first login.</Notice>}
      {err && <Notice tone="bad">{err}</Notice>}
      {!data ? <Spinner label="Loading…" /> : <ul className="panel divide-y divide-[var(--color-line)]">{data.rows.map((a) => <li key={a._id}><Link className="p-4 flex gap-3 items-center hover:bg-[var(--color-teal-50)]" href={`/admin/r/admins/${a._id}`}><span className="flex-1"><span className="font-semibold block">{a.name}</span><span className="muted">{a.email}</span></span><span className="badge badge-teal">{a.adminRole?.replace("_", " ")}</span><StatusBadge status={a.status === "active" ? "approved" : "suspended"} label={a.status} /><span className="muted text-sm hidden sm:inline">{a.lastLoginAt ? dateTime(a.lastLoginAt) : "never"}</span></Link></li>)}</ul>}
    </div>
  );
}
