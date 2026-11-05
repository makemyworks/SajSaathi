"use client";
import { useEffect, useState } from "react";
import { inr } from "@/lib/shared/format";
import { Empty, Spinner } from "@/lib/shared/ui";

/** Commission per partner for a month, computed by the API from completed bookings (same data as the CSV report). */
export default function Commissions() {
  const [month, setMonth] = useState(new Date(Date.now() + 330 * 60000).toISOString().slice(0, 7));
  const [rows, setRows] = useState<string[][] | null>(null);
  useEffect(() => {
    setRows(null);
    const from = `${month}-01`; const d = new Date(from); d.setUTCMonth(d.getUTCMonth() + 1);
    fetch(`/api/admin-proxy?${new URLSearchParams({ path: "admin/reports", kind: "commissions", from, to: d.toISOString().slice(0, 10) }).toString()}`).then((r) => r.text()).then((csv) => setRows(csv.replace(/^﻿/, "").trim().split("\n").slice(1).filter(Boolean).map((l) => l.split(","))));
  }, [month]);
  const total = (i: number) => (rows ?? []).reduce((s, r) => s + Number(r[i] || 0), 0);
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl">Commissions</h1>
      <label className="field max-w-xs"><span>Month</span><input type="month" className="input" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
      {!rows ? <Spinner label="Loading…" /> : rows.length === 0 ? <Empty title="No completed bookings this month" /> : (
        <div className="panel overflow-x-auto"><table className="w-full text-left"><thead className="bg-[var(--color-ivory)]"><tr className="[&_th]:p-3"><th>Partner</th><th className="text-right">Bookings</th><th className="text-right">Service value</th><th className="text-right">Commission</th></tr></thead>
          <tbody className="divide-y divide-[var(--color-line)]">{rows.map((r) => <tr key={r[0]} className="[&_td]:p-3"><td>{r[1]?.replace(/^"|"$/g, "")}</td><td className="text-right tabular-nums">{r[2]}</td><td className="text-right tabular-nums">{inr(Number(r[3]))}</td><td className="text-right tabular-nums">{inr(Number(r[4]))}</td></tr>)}</tbody>
          <tfoot><tr className="[&_td]:p-3 font-semibold border-t-2 border-[var(--color-line)]"><td>Total</td><td className="text-right tabular-nums">{total(2)}</td><td className="text-right tabular-nums">{inr(total(3))}</td><td className="text-right tabular-nums">{inr(total(4))}</td></tr></tfoot></table></div>
      )}
    </div>
  );
}
