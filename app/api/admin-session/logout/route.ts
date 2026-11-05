import { NextResponse, type NextRequest } from "next/server";
import { callApi, COOKIE } from "@/lib/bff";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (token) await callApi(req, "/auth/logout", { method: "POST", token }).catch(() => undefined);
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}
