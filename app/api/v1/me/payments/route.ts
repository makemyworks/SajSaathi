import type { Payment, Booking } from "@/lib/core/types";
import { api, needLogin } from "@/lib/server/http";
export const GET = api(async ({ ctx, actor }) => {
  const a = needLogin(actor);
  const ps = await ctx.repo.col<Payment>("payments").find({ customerId: a.userId }, { sort: { createdAt: -1 }, limit: 100 });
  const bs = ps.length ? await ctx.repo.col<Booking>("bookings").find({ _id: { $in: ps.map((p) => p.bookingId) } }) : [];
  return { payments: ps.map((p) => { const b = bs.find((x) => x._id === p.bookingId); return { id: p._id, bookingId: p.bookingId, ref: b?.ref, service: b?.serviceName, amountPaise: p.amountPaise, refundedPaise: p.refundedPaise, status: p.status, method: p.method, receiptNo: p.receiptNo, createdAt: p.createdAt }; }) };
});
