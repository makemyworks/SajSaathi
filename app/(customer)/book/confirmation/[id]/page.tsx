import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { getBooking } from "@/lib/core/bookings";
import type { Provider } from "@/lib/core/types";
import { getCtx, payments } from "@/lib/server/ctx";
import { currentActor, dict, locale } from "@/lib/session";
import { fmt } from "@/lib/shared/i18n";
import { dateTime, inr } from "@/lib/shared/format";
import { StatusBadge } from "@/lib/shared/ui";
import { PaymentStatusWatcher } from "@/components/PaymentStatusWatcher";

export const metadata: Metadata = { title: "Booking request sent", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await currentActor();
  if (!actor) redirect(`/login?next=/book/confirmation/${id}`);
  const [ctx, t, lang] = await Promise.all([getCtx(), dict(), locale()]);
  const b = await getBooking(ctx, actor, id).catch(() => null);
  if (!b) notFound();
  const p = await ctx.repo.col<Provider>("providers").findOne({ _id: b.providerId });
  return (
    <div className="wrap py-10 max-w-xl grid gap-6">
      <div className="grid gap-3 justify-items-start">
        <CircleCheck aria-hidden size={44} className="text-[var(--color-ok)]" />
        <h1>{t.booking.successTitle}</h1>
        <p className="text-lg">{fmt(t.booking.successBody, { provider: p?.businessName ?? "" })}</p>
      </div>
      <dl className="panel p-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3">
        <dt className="muted">{t.booking.reference}</dt><dd className="font-semibold tabular-nums tracking-wide">{b.ref}</dd>
        <dt className="muted">{t.booking.service}</dt><dd>{b.serviceName}</dd>
        <dt className="muted">{t.booking.chooseDate}</dt><dd>{dateTime(b.start, lang)}</dd>
        <dt className="muted">{t.booking.total}</dt><dd className="font-semibold tabular-nums">{inr(b.price.totalPaise, lang)}</dd>
        <dt className="muted">Status</dt><dd><StatusBadge status={b.status} label={t.status[b.status]} /></dd>
      </dl>
      {b.paymentMethod === "online" && <PaymentStatusWatcher bookingId={b._id} initial={b.paymentStatus} canPay={!!payments} description={`${b.serviceName} · ${p?.businessName ?? ""}`} />}
      <div className="flex gap-3 flex-wrap">
        <Link href={`/account/bookings/${b._id}`} className="btn btn-primary">{t.booking.viewBooking}</Link>
        <Link href="/" className="btn btn-outline">Saj Saathi</Link>
      </div>
    </div>
  );
}
