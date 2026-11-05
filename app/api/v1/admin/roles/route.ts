import { ADMIN_PERMISSIONS, DEFAULT_ADMIN_ROLE_PERMISSIONS } from "@/lib/core/permissions";
import { audit } from "@/lib/core/context";
import { badRequest } from "@/lib/core/util";
import { api, body } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";
export const GET = api(async ({ ctx, actor }) => {
  await admin(ctx, actor, "admins.manage");
  const doc = await ctx.repo.col<{ _id: string; roles?: Record<string, string[]> }>("settings").findOne({ _id: "admin_roles" });
  return { roles: { ...DEFAULT_ADMIN_ROLE_PERMISSIONS, ...(doc?.roles ?? {}), super_admin: "*" }, permissions: ADMIN_PERMISSIONS };
});
export const PUT = api(async ({ req, ctx, actor }) => {
  const a = await admin(ctx, actor, "admins.manage");
  const b = await body<{ roles: Record<string, string[]> }>(req);
  const roles: Record<string, string[]> = {};
  for (const [role, perms] of Object.entries(b.roles ?? {})) {
    if (role === "super_admin") continue; // always everything
    if (!(role in DEFAULT_ADMIN_ROLE_PERMISSIONS)) throw badRequest(`Unknown role ${role}`);
    roles[role] = (perms ?? []).filter((p) => (ADMIN_PERMISSIONS as readonly string[]).includes(p));
  }
  const col = ctx.repo.col<{ _id: string; roles: Record<string, string[]> }>("settings");
  if (!(await col.updateOne({ _id: "admin_roles" }, { $set: { roles } }))) await col.insertOne({ _id: "admin_roles", roles });
  await audit(ctx, a, "roles.update", "settings", "admin_roles");
  return { ok: true };
});
