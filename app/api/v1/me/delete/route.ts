import { NextResponse } from "next/server";
import { requestAccountDeletion } from "@/lib/core/community";
import { parse, v } from "@/lib/core/validate";
import { api, body, needLogin, SESSION_COOKIE } from "@/lib/server/http";
export const POST = api(async ({ req, ctx, actor }) => {
  await requestAccountDeletion(ctx, needLogin(actor), parse(v.object({ reason: v.optional(v.string({ max: 500 })) }), await body(req)).reason);
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
});
