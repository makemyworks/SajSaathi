"use client";
import { useEffect, useState } from "react";
import { api, useData } from "@/lib/client";
import { Notice, Spinner } from "@/lib/shared/ui";
type Flag = { _id: string; key: string; enabled: boolean };
export default function Maintenance() {
  const flags = useData<{ rows: Flag[] }>("admin/resources/flags?q=maintenance_mode");
  const settings = useData<{ settings: { maintenanceMessage?: string } | null }>("admin/settings");
  const [message, setMessage] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => { setMessage(settings.data?.settings?.maintenanceMessage ?? ""); }, [settings.data]);
  const flag = flags.data?.rows.find((f) => f.key === "maintenance_mode");
  if (!flags.data) return <Spinner label="Loading…" />;
  return (
    <div className="grid gap-4 max-w-2xl">
      <h1 className="text-2xl">Maintenance</h1>
      <p className="muted">When on, the customer site shows your message and new bookings are paused. Partners can still manage existing bookings.</p>
      <label className="field"><span>Message shown to customers</span><input className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="We're upgrading Saj Saathi. Bookings reopen at 6 pm." /></label>
      {flag ? (
        <div className="flex gap-3 items-center"><span className={`badge ${flag.enabled ? "badge-bad" : "badge-ok"}`}>{flag.enabled ? "Maintenance ON" : "Live"}</span>
          <button className="btn btn-primary" onClick={async () => { await api("admin/settings", "PATCH", { maintenanceMessage: message }); await api(`admin/resources/flags/${flag._id}`, "PATCH", { enabled: !flag.enabled }); setMsg("Updated"); flags.reload(); }}>{flag.enabled ? "Turn off maintenance" : "Turn on maintenance"}</button></div>
      ) : <Notice tone="warn">Run the setup script to create the maintenance flag.</Notice>}
      {msg && <Notice tone="ok">{msg}</Notice>}
    </div>
  );
}
