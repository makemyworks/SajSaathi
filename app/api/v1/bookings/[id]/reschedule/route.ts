import { reschedule } from "@/lib/core/bookings";
import { parse, v } from "@/lib/core/validate";
import { api, body, needLogin } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";

export const POST = api(async ({ req, ctx, actor, params }) => {
  if (actor?.role === "admin") await admin(ctx, actor, "bookings.manage");
  const b = parse(v.object({ start: v.string({ max: 40 }), staffId: v.optional(v.id()) }), await body(req));
  const booking = await reschedule(ctx, needLogin(actor), params.id, b.start, b.staffId);
  return { booking: { id: booking._id, status: booking.status, start: booking.start } };
});
