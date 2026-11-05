import { requirePartner } from "@/lib/core/partner";
import type { Provider, Payment } from "@/lib/core/types";
import { api } from "@/lib/server/http";
/** Plan, payouts and online collections for the Subscription / Payouts screens. */
export const GET = api(async ({ ctx, actor }) => {
  const a = requirePartner(actor, true);
  const [p, payouts, plans, online] = await Promise.all([
    ctx.repo.col<Provider>("providers").findOne({ _id: a.providerId }),
    ctx.repo.col<{ _id: string }>("payouts").find({ providerId: a.providerId }, { sort: { createdAt: -1 }, limit: 24 }),
    ctx.repo.col<{ _id: string; active: boolean }>("plans").find({ active: true }, { sort: { pricePaise: 1 } }),
    ctx.repo.col<Payment>("payments").find({ providerId: a.providerId, status: { $in: ["captured", "partially_refunded", "refunded"] } }, { sort: { createdAt: -1 }, limit: 100 }),
  ]);
  return { plan: p?.plan, commissionPercent: p?.commissionPercent, payouts, plans, onlinePayments: online.map((x) => ({ id: x._id, bookingId: x.bookingId, amountPaise: x.amountPaise, refundedPaise: x.refundedPaise, status: x.status, createdAt: x.createdAt })) };
});
