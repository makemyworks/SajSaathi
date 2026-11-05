import { NextResponse, type NextRequest } from "next/server";

/**
 * Backend-for-frontend: the browser talks only to this admin site; this server calls the central API
 * with the user's token, which is kept in an httpOnly cookie (never readable by JavaScript).
 */
export const COOKIE = "ssa_session";
function apiBase(req: NextRequest) {
  const configured = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  return (configured || new URL("/api/v1", req.nextUrl.origin).toString()).replace(/\/$/, "");
}

export function clientIp(req: NextRequest) {
  return req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}

export async function callApi(req: NextRequest, path: string, init: { method?: string; body?: BodyInit | null; contentType?: string | null; token?: string } = {}) {
  const headers: Record<string, string> = { "x-ss-internal-key": process.env.INTERNAL_API_KEY ?? "", "x-ss-client-ip": clientIp(req), "user-agent": req.headers.get("user-agent") ?? "" };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  if (init.contentType) headers["content-type"] = init.contentType;
  return fetch(`${apiBase(req)}${path}`, { method: init.method ?? "GET", headers, body: init.body ?? undefined, cache: "no-store" });
}

/** Blocks cross-site form posts (CSRF): writes must come from this same site. */
export function sameOrigin(req: NextRequest) {
  if (["GET", "HEAD"].includes(req.method)) return true;
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return !!origin && new URL(origin).host === host;
}

export function setSession(res: NextResponse, token: string, ttl: number) {
  res.cookies.set({ name: COOKIE, value: token, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: ttl });
}
export function forbidden() { return NextResponse.json({ error: { code: "bad_origin", message: "Request blocked. Please reload the page." } }, { status: 403 }); }
