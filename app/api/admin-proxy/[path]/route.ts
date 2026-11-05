import { NextResponse, type NextRequest } from "next/server";
import { callApi, COOKIE, forbidden, sameOrigin } from "@/lib/bff";

import { allowed } from "@/lib/allow";

async function handle(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  if (!allowed(path)) return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
  if (!sameOrigin(req)) return forbidden();
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: { code: "unauthenticated", message: "Please log in" } }, { status: 401 });
  const hasBody = !["GET", "HEAD"].includes(req.method);
  const r = await callApi(req, `/${path}${req.nextUrl.search}`, { method: req.method, token, body: hasBody ? await req.arrayBuffer() : null, contentType: req.headers.get("content-type") });
  const res = new NextResponse(r.body, { status: r.status, headers: { "content-type": r.headers.get("content-type") ?? "application/json", "cache-control": "no-store" } });
  if (r.status === 401) res.cookies.set({ name: COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}
export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
