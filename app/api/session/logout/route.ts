import { NextResponse, type NextRequest } from "next/server";
import { callApi, COOKIE, forbidden, sameOrigin } from "@/lib/bff";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return forbidden();
  const token = req.cookies.get(COOKIE)?.value;
  if (token) await callApi(req, "/auth/logout", { method: "POST", token, signal: AbortSignal.timeout(10_000) }).catch(() => undefined);
  const response = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  response.cookies.set({ name: COOKIE, value: "", path: "/", maxAge: 0, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" });
  return response;
}
