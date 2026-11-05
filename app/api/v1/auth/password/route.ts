import { changePassword } from "@/lib/core/auth";
import { parse, v } from "@/lib/core/validate";
import { api, body, needLogin } from "@/lib/server/http";

export const POST = api(async ({ req, ctx, actor }) => {
  const b = parse(v.object({ current: v.string({ trim: false }), next: v.string({ min: 8, trim: false }) }), await body(req));
  await changePassword(ctx, needLogin(actor), b.current, b.next);
  return { ok: true, message: "Password changed. Please log in again on your other devices." };
});
