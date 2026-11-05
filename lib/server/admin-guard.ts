import { requireAdmin, type AdminPermission } from "@/lib/core/permissions";
import type { Actor, AdminRole } from "@/lib/core/types";
import type { Ctx } from "@/lib/core/context";
import { AppError } from "@/lib/core/util";

/** Server-side permission check for every admin endpoint, honouring overrides saved on the Role Permissions page. */
export async function admin(ctx: Ctx, actor: Actor | null, perm: AdminPermission): Promise<Actor> {
  if (!actor) throw new AppError(401, "unauthenticated", "Please log in");
  const doc = await ctx.repo.col<{ _id: string; roles: Partial<Record<AdminRole, AdminPermission[] | "*">> }>("settings").findOne({ _id: "admin_roles" });
  const overrides = doc?.roles ? { ...doc.roles, super_admin: "*" as const } : undefined;
  return requireAdmin(actor, perm, overrides);
}
