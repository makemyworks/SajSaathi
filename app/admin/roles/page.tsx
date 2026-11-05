"use client";
import { useEffect, useState } from "react";
import { api, useData } from "@/lib/client";
import { Notice, Spinner } from "@/lib/shared/ui";

export default function Roles() {
  const { data } = useData<{ roles: Record<string, string[] | "*">; permissions: string[] }>("admin/roles");
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  useEffect(() => { if (data) setRoles(Object.fromEntries(Object.entries(data.roles).filter(([k]) => k !== "super_admin").map(([k, v]) => [k, v === "*" ? data.permissions : v]))); }, [data]);
  if (!data) return <Spinner label="Loading…" />;
  const names = Object.keys(roles);
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl">Role permissions</h1>
      <p className="muted">Super admin always has every permission. Changes apply on the next request — the server checks permissions on every call.</p>
      <div className="panel overflow-auto max-h-[70vh]"><table className="text-[0.95rem]"><thead className="sticky top-0 bg-[var(--color-ivory)]"><tr className="[&_th]:p-2"><th className="text-left">Permission</th>{names.map((n) => <th key={n} className="capitalize">{n}</th>)}</tr></thead>
        <tbody className="divide-y divide-[var(--color-line)]">{data.permissions.map((p) => <tr key={p}><td className="p-2 font-mono text-sm">{p}</td>{names.map((n) => <td key={n} className="p-2 text-center"><input type="checkbox" aria-label={`${n}: ${p}`} className="size-5" checked={roles[n].includes(p)} onChange={(e) => setRoles({ ...roles, [n]: e.target.checked ? [...roles[n], p] : roles[n].filter((x) => x !== p) })} /></td>)}</tr>)}</tbody></table></div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <button className="btn btn-primary justify-self-start" onClick={async () => { try { await api("admin/roles", "PUT", { roles }); setMsg({ tone: "ok", text: "Saved" }); } catch (e) { setMsg({ tone: "bad", text: (e as Error).message }); } }}>Save permissions</button>
    </div>
  );
}
