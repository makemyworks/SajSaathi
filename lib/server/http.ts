import { NextResponse, type NextRequest } from "next/server";
import { resolveActor } from "@/lib/core/auth";
import type { Ctx } from "@/lib/core/context";
import type { Actor } from "@/lib/core/types";
import { AppError } from "@/lib/core/util";
import { getCtx } from "./ctx";

export const SESSION_COOKIE = "ss_session";
export const API_VERSION = "v1";

export interface ApiCall { req: NextRequest; ctx: Ctx; actor: Actor | null; ip: string; params: Record<string, string>; token?: string }

/**
 * Wraps every /api/v1 route:
 *  - builds the server context and resolves the caller (cookie for the customer site, Bearer for partner/admin servers)
 *  - CSRF: cookie-authenticated writes must come from our own origin
 *  - converts AppError into { error: { code, message, details } } with the right status; hides internal errors
 */
export function api(fn: (c: ApiCall) => Promise<unknown>) {
  return async (req: NextRequest, route: { params: Promise<Record<string, string>> }) => {
    try {
      const ctx = await getCtx();
      const bearer = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
      const cookie = req.cookies.get(SESSION_COOKIE)?.value;
      if (!bearer && cookie && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        const origin = req.headers.get("origin");
        const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
        if (!origin || new URL(origin).host !== host) throw new AppError(403, "bad_origin", "Request blocked for your security. Please reload the page.");
      }
      const token = bearer ?? cookie;
      const actor = await resolveActor(ctx, token);
      const internal = process.env.INTERNAL_API_KEY && req.headers.get("x-ss-internal-key") === process.env.INTERNAL_API_KEY;
      const ip = (internal && req.headers.get("x-ss-client-ip")) || req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const params = (await route?.params) ?? {};
      const out = await fn({ req, ctx, actor, ip, params, token });
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true }, { headers: { "x-api-version": API_VERSION } });
    } catch (e) {
      if (e instanceof AppError) return NextResponse.json({ error: { code: e.code, message: e.message, details: e.details } }, { status: e.status });
      console.error("[api]", req.method, req.nextUrl.pathname, e);
      return NextResponse.json({ error: { code: "server_error", message: "Something went wrong on our side. Please try again." } }, { status: 500 });
    }
  };
}

export async function body<T = Record<string, unknown>>(req: NextRequest, maxBytes = 64_000): Promise<T> {
  const text = await req.text();
  if (text.length > maxBytes) throw new AppError(413, "too_large", "Request is too large");
  if (!text) return {} as T;
  try { return JSON.parse(text) as T; } catch { throw new AppError(400, "bad_json", "Invalid request body"); }
}

export function query(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  return { get: (k: string) => q.get(k) ?? undefined, num: (k: string) => (q.get(k) ? Number(q.get(k)) : undefined) };
}

export function needLogin(actor: Actor | null): Actor {
  if (!actor) throw new AppError(401, "unauthenticated", "Please log in");
  return actor;
}

export function sessionCookie(token: string, maxAgeSeconds: number) {
  return { name: SESSION_COOKIE, value: token, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: maxAgeSeconds };
}
