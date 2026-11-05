import { api, query } from "@/lib/server/http";
export const GET = api(async ({ req, ctx }) => ({ faqs: await ctx.repo.col<{ _id: string }>("faqs").find({ audience: query(req).get("audience") ?? "customer" }, { sort: { order: 1 } }) }));
