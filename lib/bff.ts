import { NextResponse, type NextRequest } from "next/server";

/**
 * Backend-for-frontend: browsers talk only to this Partner deployment. The central API token
 * stays in an httpOnly cookie and the internal service key is attached only on the server.
 */
export const COOKIE = "ssp_session";

export function getApiBaseUrl() {
  const value = (process.env.API_URL || "").trim().replace(/\/+$/, "");
  if (!value) throw new Error("API_URL is missing. Set it to the Customer project's /api/v1 URL.");
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("API_URL must be a valid absolute URL ending in /api/v1."); }
  if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password || parsed.search || parsed.hash || !parsed.pathname.replace(/\/+$/, "").endsWith("/api/v1")) {
    throw new Error("API_URL must be an HTTP(S) URL ending in /api/v1, without query parameters.");
  }
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new Error("Production API_URL must use HTTPS.");
  }
  return value;
}

export function clientIp(req: NextRequest) {
  return req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}

export async function callApi(req: NextRequest, path: string, init: {
  method?: string;
  body?: BodyInit | null;
  contentType?: string | null;
  token?: string;
  signal?: AbortSignal;
} = {}) {
  const apiBase = getApiBaseUrl();
  const internalApiKey = process.env.INTERNAL_API_KEY?.trim();
  if (!internalApiKey) throw new Error("INTERNAL_API_KEY is missing.");
  const headers: Record<string, string> = {
    "x-ss-internal-key": internalApiKey,
    "x-ss-client-ip": clientIp(req),
    "user-agent": req.headers.get("user-agent") ?? "SajSaathiPartner/1.0",
  };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  if (init.contentType) headers["content-type"] = init.contentType;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${apiBase}${cleanPath}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body ?? undefined,
    cache: "no-store",
    signal: init.signal,
  });
}

/** Blocks cross-site form posts (CSRF). Account writes must originate from this deployment. */
export function sameOrigin(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  let originHost: string;
  try {
    const parsedOrigin = new URL(origin);
    if (!["https:", "http:"].includes(parsedOrigin.protocol)) return false;
    originHost = parsedOrigin.host.toLowerCase();
  } catch {
    return false;
  }
  const rawHosts = [req.headers.get("x-forwarded-host"), req.headers.get("host")]
    .map((item) => item?.split(",")[0]?.trim())
    .filter((item): item is string => Boolean(item));
  const acceptedHosts = rawHosts.flatMap((item) => {
    try { return [new URL(`https://${item}`).host.toLowerCase()]; } catch { return []; }
  });
  return acceptedHosts.includes(originHost);
}

export function setSession(res: NextResponse, token: string, ttl: number) {
  const safeTtl = Number.isFinite(ttl) && ttl > 0 ? Math.min(Math.floor(ttl), 60 * 60 * 24 * 30) : 60 * 60 * 24 * 30;
  res.cookies.set({ name: COOKIE, value: token, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: safeTtl });
}

export function forbidden() {
  return NextResponse.json(
    { error: { code: "bad_origin", message: "Request blocked for your security. Reload this page and try again." } },
    { status: 403, headers: { "cache-control": "no-store" } },
  );
}

export function authUnavailable() {
  return NextResponse.json(
    { error: { code: "partner_api_unavailable", message: "The Partner sign-in service cannot reach Saj Saathi. Check API_URL and ensure INTERNAL_API_KEY matches the Customer + Admin project, then redeploy both projects if the key was changed." } },
    { status: 503, headers: { "cache-control": "no-store" } },
  );
}
