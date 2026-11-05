"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Booking } from "@/lib/core/types";
import { api, useData } from "@/lib/client";
import { dateTime, inr } from "@/lib/shared/format";
import { Notice, Spinner, StatusBadge } from "@/lib/shared/ui";
import { useAdmin } from "@/components/Admin";

type D = { booking: Booking; provider: { id: string; name: string; slug: string } | null; payments: { id: string; status: string; amountPaise: number; refundedPaise: number; receiptNo?: string; createdAt: string }[] };
export default function AdminBooking() {
  const { id } = useParams() as { id: string };
  const { can } = useAdmin();
  const { data, reload } = useData<D>(`bookings/${id}`);
  const [err, setErr] = useState("");
  if (!data) return <Spinner label="Loading…" />;
  const b = data.booking;
  const act = async (action: string) => { const note = action === "cancel" ? prompt("Reason shown to the customer") ?? undefined : undefined; if (action === "cancel" && !note) return; setErr(""); try { await api(`bookings/${id}/action`, "POST", { action, note }); reload(); } catch (e) { setErr((e as Error).message); } };
  return (
    <div className="grid gap-4 max-w-4xl">
      <Link className="muted underline" href="/admin/r/bookings">← Bookings</Link>
      <div className="flex gap-3 items-start flex-wrap"><h1 className="text-2xl mr-auto">{b.ref}</h1><StatusBadge status={b.status} /><StatusBadge status={b.paymentStatus} /></div>
      <dl className="panel p-4 grid sm:grid-cols-[12rem_1fr] gap-x-4 gap-y-2">
        <dt className="muted">Customer</dt><dd>{b.customerName} {b.customerPhone && <span className="muted">· {b.customerPhone}</span>}</dd>
        <dt className="muted">Provider</dt><dd>{data.provider ? <Link className="underline" href={`/admin/applications/${data.provider.id}`}>{data.provider.name}</Link> : "—"}</dd>
        <dt className="muted">Service</dt><dd>{b.serviceName}</dd>
        <dt className="muted">When</dt><dd>{dateTime(b.start)} – {dateTime(b.end)}</dd>
        <dt className="muted">Where</dt><dd>{b.mode === "at_home" ? `Home: ${[b.address?.line1, b.address?.locality, b.address?.city, b.address?.pin].filter(Boolean).join(", ")}` : "At provider"}</dd>
        <dt className="muted">Price</dt><dd className="tabular-nums">Service {inr(b.price.basePaise)} + add-ons {inr(b.price.addOnsPaise)} + travel {inr(b.price.travelPaise)} + fee {inr(b.price.bookingFeePaise)} + GST {inr(b.price.taxPaise)} − discount {inr(b.price.discountPaise)} = <strong>{inr(b.price.totalPaise)}</strong> (commission {inr(b.price.commissionPaise)})</dd>
        {b.couponCode && <><dt className="muted">Coupon</dt><dd>{b.couponCode}</dd></>}
        {b.cancellationReason && <><dt className="muted">Cancellation</dt><dd>{b.cancellationReason} · fee {inr(b.cancellationFeePaise ?? 0)}{b.providerPenaltyPaise ? ` · provider charge ${inr(b.providerPenaltyPaise)}` : ""}</dd></>}
        {b.consentAt && <><dt className="muted">Consent given</dt><dd>{dateTime(b.consentAt)}</dd></>}
        {Object.keys(b.fields).length > 0 && <><dt className="muted">Answers</dt><dd className="text-[0.95rem]">{Object.entries(b.fields).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`).join(" · ")}</dd></>}
      </dl>
      {can("bookings.manage") && ["pending", "confirmed", "rescheduled"].includes(b.status) && <div className="flex gap-2 flex-wrap">{b.status === "pending" && <button className="btn btn-outline" onClick={() => act("confirm")}>Confirm on behalf of provider</button>}<button className="btn btn-danger" onClick={() => act("cancel")}>Cancel booking</button></div>}
      {err && <Notice tone="bad">{err}</Notice>}
      <section className="panel p-4 grid gap-2"><h2 className="text-lg">Payments</h2>{data.payments.length === 0 ? <p className="muted">None ({b.paymentMethod === "pay_at_venue" ? "pay at venue" : "not started"}).</p> : data.payments.map((p) => <p key={p.id} className="flex gap-3"><StatusBadge status={p.status} /><span className="tabular-nums">{inr(p.amountPaise)}</span>{p.refundedPaise > 0 && <span>refunded {inr(p.refundedPaise)}</span>}<span className="muted">{p.receiptNo ?? ""} · {dateTime(p.createdAt)}</span></p>)}</section>
      <section className="panel p-4 grid gap-1"><h2 className="text-lg">Timeline</h2>{b.history.map((h, i) => <p key={i}><StatusBadge status={h.to} /> <span className="muted">{dateTime(h.at)} · {h.byRole}</span>{h.note ? ` — ${h.note}` : ""}</p>)}</section>
    </div>
  );
}
