import { NextResponse, type NextRequest } from "next/server";
import { callApi, COOKIE, forbidden, sameOrigin } from "@/lib/bff";
import { allowed } from "@/lib/allow";

/**
 * Same-origin admin backend-for-frontend proxy.
 * The target API path is passed as a query value so this route does not need
 * a special `[...path]` folder name in GitHub's web uploader.
 */
export async function handleAdminProxy(req: NextRequest, targetPath: string) {
  const path = targetPath.replace(/^\/+/, "");

  if (!path || path.includes("?") || path.includes("\\") || !allowed(path)) {
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

  // Preserve endpoint query parameters while removing the proxy's own `path` key.
  const upstreamQuery = new URLSearchParams(req.nextUrl.searchParams);
  upstreamQuery.delete("path");
  const search = upstreamQuery.toString();
  const upstreamPath = `/${path}${search ? `?${search}` : ""}`;

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const upstream = await callApi(req, upstreamPath, {
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
