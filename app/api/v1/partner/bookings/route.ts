import { listBookings, bookingSummary } from "@/lib/core/bookings";
import { requirePartner } from "@/lib/core/partner";
import { api, query } from "@/lib/server/http";
export const GET = api(async ({ req, ctx, actor }) => {
  const a = requirePartner(actor);
  const q = query(req);
  const scope = q.get("scope");
  const list = await listBookings(ctx, a, { scope: scope === "upcoming" || scope === "completed" || scope === "cancelled" || scope === "pending" || scope === "today" ? scope : "all", from: q.get("from") ? new Date(q.get("from")!) : undefined, to: q.get("to") ? new Date(q.get("to")!) : undefined, limit: q.num("limit") ?? 200 });
  return { bookings: list.map(bookingSummary) };
});
