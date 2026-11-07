import { publicUser, updateAdminProfile } from "@/lib/core/auth";
import { parse, v } from "@/lib/core/validate";
import { api, body, needLogin } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";

const schema = v.object({
  name: v.string({ min: 2, max: 80 }),
  email: v.string({ min: 5, max: 120, lower: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, msg: "Enter a valid email address" }),
  currentPassword: v.string({ min: 1, max: 128, trim: false }),
});

export const PATCH = api(async ({ req, ctx, actor }) => {
  const a = await admin(ctx, needLogin(actor), "dashboard.view");
  const input = parse(schema, await body(req));
  const user = await updateAdminProfile(ctx, a, input);
  return { user: publicUser(user), message: "Admin profile updated. Your new email will be used for your next login." };
});
