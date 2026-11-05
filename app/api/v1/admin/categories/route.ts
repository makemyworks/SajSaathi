import { saveCategory } from "@/lib/core/admin";
import type { Category } from "@/lib/core/types";
import { api, body } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";
export const GET = api(async ({ ctx, actor }) => { await admin(ctx, actor, "catalog.manage"); return { categories: await ctx.repo.col<Category>("categories").find({}, { sort: { sortOrder: 1 } }) }; });
export const POST = api(async ({ req, ctx, actor }) => { const a = await admin(ctx, actor, "catalog.manage"); const b = await body<Partial<Category>>(req, 200_000); delete b._id; return { category: await saveCategory(ctx, a, b) }; });
