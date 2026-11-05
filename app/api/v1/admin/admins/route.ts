import { inviteAdmin } from "@/lib/core/admin";
import { parse, v } from "@/lib/core/validate";
import { api, body } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";
const schema = v.object({ name: v.string({ min: 2, max: 80 }), email: v.string({ pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, msg: "Enter a valid email", lower: true }), adminRole: v.enum(["super_admin", "operations", "finance", "support", "content", "verification"] as const) });
export const POST = api(async ({ req, ctx, actor }) => { const a = await admin(ctx, actor, "admins.manage"); return await inviteAdmin(ctx, a, parse(schema, await body(req))); });
