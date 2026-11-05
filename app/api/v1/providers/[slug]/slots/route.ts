import { getSlots } from "@/lib/core/bookings";
import type { Provider } from "@/lib/core/types";
import { notFound } from "@/lib/core/util";
import { api, query } from "@/lib/server/http";

/** Advisory free slots. The booking endpoint re-checks and locks the slot on the server. */
export const GET = api(async ({ req, ctx, params }) => {
  const q = query(req);
  const p = await ctx.repo.col<Provider>("providers").findOne({ slug: params.slug, status: "approved" });
  if (!p) throw notFound("Provider");
  const mode = q.get("mode") === "at_home" ? "at_home" : "in_store";
  return getSlots(ctx, { providerId: p._id, serviceId: q.get("serviceId") ?? "", date: q.get("date") ?? "", addOnIds: (q.get("addOns") ?? "").split(",").filter(Boolean), staffId: q.get("staffId") || undefined, mode });
});
