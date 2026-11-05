import { actOnBooking } from "@/lib/core/bookings";
import { parse, v } from "@/lib/core/validate";
import { api, body, needLogin } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";

const schema = v.object({ action: v.enum(["confirm", "reject", "cancel", "arrived", "start", "complete", "no_show"] as const), note: v.optional(v.string({ max: 300 })) });
export const POST = api(async ({ req, ctx, actor, params }) => {
  if (actor?.role === "admin") await admin(ctx, actor, "bookings.manage");
  const b = parse(schema, await body(req));
  const booking = await actOnBooking(ctx, needLogin(actor), params.id, b.action, b.note);
  return { booking: { id: booking._id, status: booking.status, arrivedAt: booking.arrivedAt } };
});
