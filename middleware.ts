import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "ssa_session";
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isAdminLogin = path === "/admin/login";
  const isAdminPage = path === "/admin" || path.startsWith("/admin/");
  const isAdminProxy = path.startsWith("/api/admin-proxy/");
  if (!isAdminPage && !isAdminProxy) return NextResponse.next();
  if (isAdminLogin) return NextResponse.next();
  if (req.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();
  if (isAdminProxy) return NextResponse.json({ error: { code: "unauthenticated", message: "Please sign in to the admin console." } }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = `?next=${encodeURIComponent(path + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}
export const config = { matcher: ["/admin", "/admin/:path*", "/api/admin-proxy/:path*"] };
