import { NextResponse } from "next/server";
import { logout } from "@/lib/core/auth";
import { api, SESSION_COOKIE } from "@/lib/server/http";

export const POST = api(async ({ ctx, token }) => {
  await logout(ctx, token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
});
