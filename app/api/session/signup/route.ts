import { NextResponse, type NextRequest } from "next/server";
import { authUnavailable, callApi, forbidden, sameOrigin, setSession } from "@/lib/bff";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return forbidden();
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const acceptTerms = body?.acceptTerms === true;
  const locale = body?.locale === "hi" ? "hi" : "en";

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: { code: "validation_error", message: "Enter your full name (2–80 characters)." } }, { status: 400, headers: { "cache-control": "no-store" } });
  }
  const digits = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  const normalizedDigits = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;
  if (!/^[6-9]\d{9}$/.test(normalizedDigits)) {
    return NextResponse.json({ error: { code: "validation_error", message: "Enter a valid 10-digit Indian mobile number." } }, { status: 400, headers: { "cache-control": "no-store" } });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: { code: "validation_error", message: "Enter a valid email address or leave it blank." } }, { status: 400, headers: { "cache-control": "no-store" } });
  }
  if (password.length < 8 || password.length > 128 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return NextResponse.json({ error: { code: "validation_error", message: "Use at least 8 characters, including one letter and one number." } }, { status: 400, headers: { "cache-control": "no-store" } });
  }
  if (!acceptTerms) {
    return NextResponse.json({ error: { code: "terms_required", message: "Please accept the Terms and Privacy Policy to create your account." } }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  let upstream: Response;
  try {
    upstream = await callApi(req, "/auth/register", {
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({ name, phone, email: email || undefined, password, role: "partner_owner", locale, acceptTerms: true }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    console.error("[Partner sign-up] Central API request failed:", error instanceof Error ? error.message : "unknown error");
    return authUnavailable();
  }

  const payload = await upstream.json().catch(() => null) as { token?: string; user?: unknown; ttl?: number; error?: unknown } | null;
  if (!upstream.ok) {
    const response = payload && typeof payload === "object" && payload.error
      ? { error: payload.error }
      : { error: { code: "upstream_error", message: `Saj Saathi could not create your account (HTTP ${upstream.status}). Please try again.` } };
    return NextResponse.json(response, { status: upstream.status, headers: { "cache-control": "no-store" } });
  }
  if (!payload?.token || !payload.user) {
    return NextResponse.json({ error: { code: "invalid_auth_response", message: "Your account request reached Saj Saathi, but a Partner session was not returned. Contact support before submitting again." } }, { status: 502, headers: { "cache-control": "no-store" } });
  }

  const response = NextResponse.json({ user: payload.user }, { headers: { "cache-control": "no-store" } });
  setSession(response, payload.token, payload.ttl ?? 60 * 60 * 24 * 30);
  response.cookies.set({ name: "ss_locale", value: locale, httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 31536000 });
  return response;
}
