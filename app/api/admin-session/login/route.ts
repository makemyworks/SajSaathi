import { NextResponse, type NextRequest } from "next/server";
import { callApi, forbidden, sameOrigin, setSession } from "@/lib/bff";

/** Two-step login: password, then the 6-digit authenticator code when MFA is on. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return forbidden();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const r = await callApi(req, "/auth/login", { method: "POST", contentType: "application/json", body: JSON.stringify({ identifier: b.email, password: b.password, totp: b.totp || undefined, app: "admin" }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return NextResponse.json(j, { status: r.status });
  if (j.mfaRequired) return NextResponse.json({ mfaRequired: true });
  if (!j.token) return NextResponse.json({ error: { message: "Login failed" } }, { status: 400 });
  const res = NextResponse.json({ user: j.user });
  setSession(res, j.token, j.ttl ?? 8 * 3600);
  return res;
}
