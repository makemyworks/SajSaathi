import type { Booking, Refund } from "@/lib/core/types";
import { api, query } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";
export const GET = api(async ({ req, ctx, actor }) => {
  await admin(ctx, actor, "refunds.manage");
  const status = query(req).get("status");
  const rows = await ctx.repo.col<Refund>("refunds").find(status ? { status } : {}, { sort: { createdAt: -1 }, limit: 200 });
  const bs = rows.length ? await ctx.repo.col<Booking>("bookings").find({ _id: { $in: rows.map((r) => r.bookingId) } }) : [];
  return { refunds: rows.map((r) => ({ ...r, booking: bs.find((b) => b._id === r.bookingId) ? { ref: bs.find((b) => b._id === r.bookingId)!.ref, customerName: bs.find((b) => b._id === r.bookingId)!.customerName, totalPaise: bs.find((b) => b._id === r.bookingId)!.price.totalPaise } : null })) };
});
