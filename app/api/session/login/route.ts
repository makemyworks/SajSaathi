import { NextResponse, type NextRequest } from "next/server";
import { authUnavailable, callApi, forbidden, sameOrigin, setSession } from "@/lib/bff";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return forbidden();
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!identifier || !password) {
    return NextResponse.json({ error: { code: "validation_error", message: "Enter your mobile number or email and password." } }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  let upstream: Response;
  try {
    upstream = await callApi(req, "/auth/login", {
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({ identifier, password, app: "partner" }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    console.error("[Partner sign-in] Central API request failed:", error instanceof Error ? error.message : "unknown error");
    return authUnavailable();
  }

  const payload = await upstream.json().catch(() => null) as { token?: string; user?: unknown; ttl?: number; mfaRequired?: boolean; error?: unknown } | null;
  if (!upstream.ok) {
    const response = payload && typeof payload === "object" && payload.error
      ? { error: payload.error }
      : { error: { code: "upstream_error", message: `Saj Saathi could not sign you in (HTTP ${upstream.status}). Please try again.` } };
    return NextResponse.json(response, { status: upstream.status, headers: { "cache-control": "no-store" } });
  }
  if (payload?.mfaRequired) {
    return NextResponse.json({ error: { code: "mfa_not_supported_for_partner", message: "This account requires an administrator sign-in flow. Please use the correct Partner account or contact support." } }, { status: 403, headers: { "cache-control": "no-store" } });
  }
  if (!payload?.token || !payload.user) {
    return NextResponse.json({ error: { code: "invalid_auth_response", message: "The central service did not return a valid Partner session. Check the Customer API deployment and try again." } }, { status: 502, headers: { "cache-control": "no-store" } });
  }

  const response = NextResponse.json({ user: payload.user }, { headers: { "cache-control": "no-store" } });
  setSession(response, payload.token, payload.ttl ?? 60 * 60 * 24 * 30);
  const locale = (payload.user as { locale?: string }).locale;
  if (locale === "hi" || locale === "en") response.cookies.set({ name: "ss_locale", value: locale, httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 31536000 });
  return response;
}
