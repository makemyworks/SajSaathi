import { toggleFavourite } from "@/lib/core/community";
import { publicProviderCard } from "@/lib/core/catalog";
import type { Provider, User } from "@/lib/core/types";
import { parse, v } from "@/lib/core/validate";
import { api, body, needLogin } from "@/lib/server/http";

export const GET = api(async ({ ctx, actor }) => {
  const u = await ctx.repo.col<User>("users").findOne({ _id: needLogin(actor).userId });
  const ps = u?.favourites?.length ? await ctx.repo.col<Provider>("providers").find({ _id: { $in: u.favourites }, status: "approved" }) : [];
  return { providers: ps.map(publicProviderCard) };
});
export const POST = api(async ({ req, ctx, actor }) => {
  const b = parse(v.object({ providerId: v.id(), on: v.boolean() }), await body(req));
  await toggleFavourite(ctx, needLogin(actor), b.providerId, b.on);
  return { ok: true };
});
