import { api } from "@/lib/server/http";
import { notFound } from "@/lib/core/util";
export const GET = api(async ({ ctx, params }) => {
  const p = await ctx.repo.col<{ _id: string; slug: string; published: boolean }>("pages").findOne({ slug: params.slug, published: true });
  if (!p) throw notFound("Page");
  return { page: p };
});
