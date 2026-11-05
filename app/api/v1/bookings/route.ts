import { createBooking, listBookings, bookingSummary } from "@/lib/core/bookings";
import { rateLimit } from "@/lib/core/auth";
import { parse, v } from "@/lib/core/validate";
import { AppError, PIN_RE } from "@/lib/core/util";
import { api, body, needLogin, query } from "@/lib/server/http";

const address = v.object({
  line1: v.string({ min: 3, max: 160 }), line2: v.optional(v.string({ max: 160 })), locality: v.optional(v.string({ max: 80 })), landmark: v.optional(v.string({ max: 80 })),
  city: v.string({ min: 2, max: 60 }), state: v.string({ min: 2, max: 60 }), pin: v.string({ pattern: PIN_RE, msg: "PIN code must be 6 digits" }), country: v.optional(v.string({ max: 2 })),
});
const schema = v.object({
  providerId: v.id(), serviceId: v.id(), staffId: v.optional(v.id()), start: v.string({ max: 40 }),
  addOnIds: v.array(v.string({ max: 40 }), { max: 20 }), mode: v.enum(["in_store", "at_home"] as const),
  address: v.optional(address), fields: v.optional(v.record()), notes: v.optional(v.string({ max: 500 })),
  couponCode: v.optional(v.string({ max: 30 })), paymentMethod: v.enum(["pay_at_venue", "online"] as const), consent: v.optional(v.boolean()),
  customerName: v.optional(v.string({ max: 80 })), customerPhone: v.optional(v.string({ max: 20 })),
});

/** Customers and partners both call this: customers book, partners add walk-ins (always server-validated). */
export const POST = api(async ({ req, ctx, actor }) => {
  const a = needLogin(actor);
  const maint = await ctx.repo.col<{ _id: string; key: string; enabled: boolean }>("feature_flags").findOne({ key: "maintenance_mode" });
  if (maint?.enabled && a.role === "customer") throw new AppError(503, "maintenance", "Bookings are paused for a short maintenance. Please try again soon.");
  await rateLimit(ctx, `book:${a.userId}`, 20, 3600);
  const b = parse(schema, await body(req));
  const booking = await createBooking(ctx, a, { ...b, address: b.address ? { ...b.address, country: b.address.country ?? "IN" } : undefined });
  return { booking: { id: booking._id, ref: booking.ref, status: booking.status, paymentMethod: booking.paymentMethod, totalPaise: booking.price.totalPaise } };
});

export const GET = api(async ({ req, ctx, actor }) => {
  const q = query(req);
  const scope = q.get("scope");
  const list = await listBookings(ctx, needLogin(actor), {
    scope: scope === "upcoming" || scope === "completed" || scope === "cancelled" || scope === "pending" || scope === "today" ? scope : "all",
    from: q.get("from") ? new Date(q.get("from")!) : undefined, to: q.get("to") ? new Date(q.get("to")!) : undefined,
    limit: q.num("limit"), skip: q.num("skip"),
  });
  return { bookings: list.map(bookingSummary) };
});
