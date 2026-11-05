import { saveCategory } from "@/lib/core/admin";
import type { Category } from "@/lib/core/types";
import { notFound } from "@/lib/core/util";
import { api, body } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";
export const GET = api(async ({ ctx, actor, params }) => { await admin(ctx, actor, "catalog.manage"); const c = await ctx.repo.col<Category>("categories").findOne({ _id: params.id }); if (!c) throw notFound(); return { category: c }; });
export const PUT = api(async ({ req, ctx, actor, params }) => { const a = await admin(ctx, actor, "catalog.manage"); return { category: await saveCategory(ctx, a, { ...(await body<Partial<Category>>(req, 200_000)), _id: params.id }) }; });
