"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import type { Branch } from "@/lib/core/types";
import { api } from "@/lib/client";
import { LoadFailure, Notice, Spinner } from "@/lib/shared/ui";
import { usePartner } from "@/components/Partner";

export default function BranchesPage() {
  const { t, app, appError, appLoading, reloadApp } = usePartner();
  const [list, setList] = useState<Branch[] | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  useEffect(() => { if (app?.application) setList(app.application.branches ?? []); }, [app]);
  if (!list) {
    if (appError) return <LoadFailure message={appError} onRetry={reloadApp} />;
    if (appLoading) return <Spinner label={t.common.loading} />;
    return <div className="grid gap-3"><Notice tone="info">Start or complete your business application before managing branches.</Notice><Link className="btn btn-primary justify-self-start" href="/application">Open application</Link></div>;
  }
  const upd = (i: number, b: Branch) => setList(list.map((x, j) => (j === i ? b : x)));
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl">{t.branches.title}</h1>
      <p className="muted">{t.branches.hint}</p>
      {list.map((b, i) => (
        <fieldset key={b.id || i} className="panel p-4 grid sm:grid-cols-2 gap-3">
          <label className="field sm:col-span-2"><span>{t.branches.name}</span><input className="input" value={b.name} onChange={(e) => upd(i, { ...b, name: e.target.value })} /></label>
          <label className="field sm:col-span-2"><span>{t.apply.line1}</span><input className="input" value={b.address.line1} onChange={(e) => upd(i, { ...b, address: { ...b.address, line1: e.target.value } })} /></label>
          <label className="field"><span>{t.apply.locality}</span><input className="input" value={b.address.locality ?? ""} onChange={(e) => upd(i, { ...b, address: { ...b.address, locality: e.target.value } })} /></label>
          <label className="field"><span>{t.apply.city}</span><input className="input" value={b.address.city} onChange={(e) => upd(i, { ...b, address: { ...b.address, city: e.target.value } })} /></label>
          <label className="field"><span>{t.apply.state}</span><input className="input" value={b.address.state} onChange={(e) => upd(i, { ...b, address: { ...b.address, state: e.target.value } })} /></label>
          <label className="field"><span>{t.apply.pin}</span><input className="input" inputMode="numeric" maxLength={6} value={b.address.pin} onChange={(e) => upd(i, { ...b, address: { ...b.address, pin: e.target.value.replace(/\D/g, "") } })} /></label>
          <div className="sm:col-span-2 flex justify-between"><label className="flex items-center gap-3"><input type="checkbox" className="size-6 accent-[var(--color-teal-800)]" checked={b.active} onChange={(e) => upd(i, { ...b, active: e.target.checked })} />Active</label><button type="button" className="btn btn-sm btn-danger" onClick={() => setList(list.filter((_, j) => j !== i))}><Trash2 aria-hidden size={16} /></button></div>
        </fieldset>
      ))}
      <div className="flex gap-2 flex-wrap">
        <button className="btn btn-outline" onClick={() => setList([...list, { id: "", name: "", address: { line1: "", city: "", state: "", pin: "", country: "IN" }, active: true }])}><Plus aria-hidden size={16} />{t.branches.add}</button>
        <button className="btn btn-primary" onClick={async () => { setMsg(null); try { await api("partner/application", "PATCH", { branches: list }); setMsg({ tone: "ok", text: t.common.saved }); reloadApp(); } catch (e) { setMsg({ tone: "bad", text: (e as Error).message }); } }}>{t.branches.save}</button>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </div>
  );
}
