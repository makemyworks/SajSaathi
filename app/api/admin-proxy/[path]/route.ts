import { NextResponse, type NextRequest } from "next/server";
import { callApi, COOKIE, forbidden, sameOrigin } from "@/lib/bff";
import { allowed } from "@/lib/allow";

export const dynamic = "force-dynamic";

/**
 * Catch-all admin BFF route. The folder MUST be named `[...path]` so that
 * Next.js supplies every remaining URL segment as `string[]`.
 */
type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, { params }: RouteContext) {
  const segments = (await params).path;
  const path = segments.join("/");

  if (!path || !allowed(path)) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Not found" } },
      { status: 404 },
    );
  }

  if (!sameOrigin(req)) return forbidden();

  const token = req.cookies.get(COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Please log in" } },
      { status: 401 },
    );
  }

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const upstream = await callApi(req, `/${path}${req.nextUrl.search}`, {
    method: req.method,
    token,
    body: hasBody ? await req.arrayBuffer() : null,
    contentType: req.headers.get("content-type"),
  });

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });

  if (upstream.status === 401) {
    response.cookies.set({ name: COOKIE, value: "", path: "/", maxAge: 0 });
  }

  return response;
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
