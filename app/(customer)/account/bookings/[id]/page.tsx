import Link from "next/link";
import { notFound } from "next/navigation";
import { getBooking } from "@/lib/core/bookings";
import type { Category, Payment, Provider, Review } from "@/lib/core/types";
import { getCtx } from "@/lib/server/ctx";
import { currentActor, dict, locale } from "@/lib/session";
import { pick } from "@/lib/shared/i18n";
import { dateTime, inr } from "@/lib/shared/format";
import { StatusBadge } from "@/lib/shared/ui";
import { BookingActions } from "@/components/account/BookingActions";
import { PaymentStatusWatcher } from "@/components/PaymentStatusWatcher";

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actor, ctx, t, lang] = await Promise.all([currentActor(), getCtx(), dict(), locale()]);
  const b = await getBooking(ctx, actor!, id).catch(() => null);
  if (!b) notFound();
  const [p, cat, pays, review] = await Promise.all([
    ctx.repo.col<Provider>("providers").findOne({ _id: b.providerId }),
    ctx.repo.col<Category>("categories").findOne({ _id: b.categoryId }),
    ctx.repo.col<Payment>("payments").find({ bookingId: b._id }, { sort: { createdAt: -1 } }),
    ctx.repo.col<Review>("reviews").findOne({ bookingId: b._id }),
  ]);
  const active = ["pending", "confirmed", "rescheduled"].includes(b.status);
  const showPhone = ["confirmed", "rescheduled", "in_progress"].includes(b.status);
  const captured = pays.find((x) => x.status === "captured" || x.status === "refunded" || x.status === "partially_refunded");
  return (
    <div className="grid gap-5">
      <Link href="/account/bookings" className="muted underline">← {t.account.bookings}</Link>
      <div className="flex items-start gap-3 flex-wrap"><h2 className="mr-auto">{b.serviceName}</h2><StatusBadge status={b.status} label={t.status[b.status]} /></div>
      <dl className="panel p-5 grid sm:grid-cols-[auto_1fr] gap-x-6 gap-y-3">
        <dt className="muted">{t.booking.reference}</dt><dd className="font-semibold tabular-nums">{b.ref}</dd>
        <dt className="muted">{t.booking.chooseDate}</dt><dd>{dateTime(b.start, lang)}</dd>
        <dt className="muted">{t.nav.providers}</dt><dd>{p ? <Link className="underline" href={`/p/${p.slug}`}>{p.businessName}</Link> : "—"}{showPhone && p?.phone ? <> · <a className="underline" href={`tel:${p.phone}`}>{p.phone}</a></> : null}</dd>
        <dt className="muted">{t.booking.chooseWhere}</dt><dd>{b.mode === "at_home" ? `${t.booking.atMyHome}: ${[b.address?.line1, b.address?.locality, b.address?.city, b.address?.pin].filter(Boolean).join(", ")}` : [p?.address.line1, p?.address.locality, p?.address.city].filter(Boolean).join(", ")}</dd>
        <dt className="muted">{t.booking.total}</dt><dd className="tabular-nums font-semibold">{inr(b.price.totalPaise, lang)} <span className="muted font-normal">· {t.pay[b.paymentStatus]}</span></dd>
        {b.cancellationFeePaise ? <><dt className="muted">{t.provider.cancellation}</dt><dd>{inr(b.cancellationFeePaise, lang)}</dd></> : null}
      </dl>
      {b.paymentMethod === "online" && active && b.paymentStatus !== "captured" && <PaymentStatusWatcher bookingId={b._id} initial={b.paymentStatus} canPay description={`${b.serviceName} · ${p?.businessName ?? ""}`} />}
      {captured?.receiptNo && <p>{t.account.receipt}: <strong className="tabular-nums">{captured.receiptNo}</strong> · {inr(captured.amountPaise, lang)}{captured.refundedPaise ? ` (−${inr(captured.refundedPaise, lang)})` : ""}</p>}
      {cat?.safetyNotice && <p className="text-[var(--color-gold-ink)]">{pick(cat.safetyNotice, lang)}</p>}
      <BookingActions booking={{ id: b._id, status: b.status, start: b.start.toISOString(), providerSlug: p?.slug ?? "", serviceId: b.serviceId, mode: b.mode, addOnIds: b.addOnIds }} canReview={b.status === "completed" && !review} reviewed={!!review} freeUntilHours={cat?.cancellationPolicy.freeUntilHours ?? 0} lateFeePercent={cat?.cancellationPolicy.lateFeePercent ?? 0} />
      <section className="grid gap-2"><h3>{t.account.history}</h3>
        <ol className="grid gap-2 border-l-2 border-[var(--color-line)] pl-4">{b.history.map((h, i) => <li key={i}><StatusBadge status={h.to} label={t.status[h.to]} /> <span className="muted text-sm">{dateTime(h.at, lang)}</span>{h.note ? <span className="block text-[0.95rem]">{h.note}</span> : null}</li>)}</ol>
      </section>
    </div>
  );
}
