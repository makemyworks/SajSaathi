import { ADMIN_RESOURCES } from "@/lib/core/admin-resources";
import { ADMIN_PERMISSIONS, DEFAULT_ADMIN_ROLE_PERMISSIONS, adminCan } from "@/lib/core/permissions";
import type { User } from "@/lib/core/types";
import { api } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";

/** Describes the sections this admin may see, so the console can build its navigation and screens. */
export const GET = api(async ({ ctx, actor }) => {
  const a = await admin(ctx, actor, "dashboard.view");
  const me = await ctx.repo.col<User>("users").findOne({ _id: a.userId });
  const doc = await ctx.repo.col<{ _id: string; roles?: Record<string, unknown> }>("settings").findOne({ _id: "admin_roles" });
  const overrides = (doc?.roles ?? undefined) as never;
  const resources = ADMIN_RESOURCES.filter((r) => adminCan(a, r.view, overrides)).map((r) => ({ ...r, canManage: !!r.manage && adminCan(a, r.manage, overrides), baseFilter: undefined }));
  const perms = ADMIN_PERMISSIONS.filter((p) => adminCan(a, p, overrides));
  return { me: { id: a.userId, name: me?.name, email: me?.email, adminRole: a.adminRole, mfaEnabled: !!me?.mfa?.enabled }, permissions: perms, resources, allPermissions: ADMIN_PERMISSIONS, defaultRoles: DEFAULT_ADMIN_ROLE_PERMISSIONS };
});
