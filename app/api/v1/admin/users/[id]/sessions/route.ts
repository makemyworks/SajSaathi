import { logoutAll } from "@/lib/core/auth";
import { audit } from "@/lib/core/context";
import { api } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";
/** Force-logout a user everywhere (e.g. suspected account compromise). */
export const DELETE = api(async ({ ctx, actor, params }) => { const a = await admin(ctx, actor, "customers.manage"); await logoutAll(ctx, params.id); await audit(ctx, a, "sessions.revoke", "user", params.id); return { ok: true }; });
