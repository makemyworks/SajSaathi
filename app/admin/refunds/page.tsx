"use client";
import { useState } from "react";
import Link from "next/link";
import type { Refund } from "@/lib/core/types";
import { api, useData } from "@/lib/client";
import { dateTime, inr } from "@/lib/shared/format";
import { Empty, Notice, Spinner, StatusBadge } from "@/lib/shared/ui";

type R = Refund & { booking: { ref: string; customerName: string; totalPaise: number } | null };
export default function Refunds() {
  const [status, setStatus] = useState("requested");
  const { data, reload } = useData<{ refunds: R[] }>(`admin/refunds${status ? `?status=${status}` : ""}`);
  const [err, setErr] = useState("");
  const decide = async (id: string, decision: "approve" | "reject", amount?: number) => { setErr(""); try { await api(`admin/refunds/${id}`, "POST", { decision, amountPaise: amount }); reload(); } catch (e) { setErr((e as Error).message); } };
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl">Refund requests</h1>
      <p className="muted max-w-[80ch]">Approving sends the refund to Razorpay. The booking is marked &quot;Refunded&quot; only when Razorpay confirms it by webhook.</p>
      <nav className="flex gap-2 flex-wrap">{["requested", "processing", "processed", "failed", "rejected", ""].map((s) => <button key={s} className="chip" aria-pressed={s === status} onClick={() => setStatus(s)}>{s || "all"}</button>)}</nav>
      {err && <Notice tone="bad">{err}</Notice>}
      {!data ? <Spinner label="Loading…" /> : data.refunds.length === 0 ? <Empty title="No refunds here" /> : (
        <ul className="grid gap-3">{data.refunds.map((r) => (
          <li key={r._id} className="panel p-4 grid gap-2">
            <div className="flex gap-3 flex-wrap items-center"><Link className="font-semibold underline" href={`/admin/bookings/${r.bookingId}`}>{r.booking?.ref ?? r.bookingId}</Link><span>{r.booking?.customerName}</span><StatusBadge status={r.status === "processed" ? "refunded" : r.status} label={r.status} /><span className="ml-auto tabular-nums font-semibold">{inr(r.amountPaise)}</span></div>
            <p className="muted text-[0.95rem]">{r.reason} · {dateTime(r.createdAt)}{r.gatewayRefundId ? ` · ${r.gatewayRefundId}` : ""}</p>
            {r.status === "requested" && <div className="flex gap-2 flex-wrap"><button className="btn btn-primary btn-sm" onClick={() => decide(r._id, "approve")}>Approve full {inr(r.amountPaise)}</button><button className="btn btn-outline btn-sm" onClick={() => { const v = prompt("Partial refund amount in ₹"); if (v) decide(r._id, "approve", Math.round(Number(v) * 100)); }}>Partial…</button><button className="btn btn-danger btn-sm" onClick={() => decide(r._id, "reject")}>Reject</button></div>}
          </li>
        ))}</ul>
      )}
    </div>
  );
}
