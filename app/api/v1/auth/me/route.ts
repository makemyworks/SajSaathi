import { publicUser } from "@/lib/core/auth";
import type { User } from "@/lib/core/types";
import { api } from "@/lib/server/http";

export const GET = api(async ({ ctx, actor }) => {
  if (!actor) return { user: null };
  const u = await ctx.repo.col<User>("users").findOne({ _id: actor.userId });
  return { user: u ? { ...publicUser(u), favourites: u.favourites ?? [] } : null };
});
