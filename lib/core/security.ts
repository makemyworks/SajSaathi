import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

// ---------------- Passwords (scrypt, per-user salt) ----------------
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${salt.toString("base64")}$${key.toString("base64")}`;
}
export async function verifyPassword(pw: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  const [alg, n, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt") return false;
  const key = await scrypt(pw, Buffer.from(saltB64, "base64"), 64, { ...SCRYPT, N: Number(n) });
  const expected = Buffer.from(keyB64, "base64");
  return expected.length === key.length && timingSafeEqual(expected, key);
}
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (pw.length > 128) return "Password is too long";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Use letters and at least one number";
  return null;
}

// ---------------- Signed tokens (HS256 JWT) ----------------
const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");
export function signToken(payload: Record<string, unknown>, secret: string, ttlSeconds: number): string {
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters");
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds }));
  const sig = createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}
export function verifyToken<T = Record<string, unknown>>(token: string | undefined, secret: string): (T & { exp: number; iat: number }) | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const expected = createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest();
  const given = Buffer.from(parts[2], "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const head = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    if (head.alg !== "HS256") return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

// ---------------- TOTP (RFC 6238) for admin MFA ----------------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
export function base32Decode(s: string): Buffer {
  const clean = s.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  let bits = 0, value = 0; const out: number[] = [];
  for (const ch of clean) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error("Invalid base32");
    value = (value << 5) | i; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}
export function newTotpSecret(): string { return base32Encode(randomBytes(20)); }
export function totp(secretB32: string, atMs = Date.now(), step = 30, digits = 6, algo: "sha1" | "sha256" | "sha512" = "sha1", rawKey?: Buffer): string {
  const counter = Math.floor(atMs / 1000 / step);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac(algo, rawKey ?? base32Decode(secretB32)).update(msg).digest();
  const off = h[h.length - 1] & 0xf;
  const code = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(code % 10 ** digits).padStart(digits, "0");
}
export function verifyTotp(secretB32: string, code: string, atMs = Date.now(), window = 1): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  for (let w = -window; w <= window; w++) {
    const c = totp(secretB32, atMs + w * 30000);
    if (timingSafeEqual(Buffer.from(c), Buffer.from(code))) return true;
  }
  return false;
}
export function otpauthUrl(secret: string, account: string, issuer = "Saj Saathi Admin"): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// ---------------- Razorpay signatures ----------------
function safeHexEqual(a: string, b: string): boolean {
  const A = Buffer.from(a, "utf8"), B = Buffer.from(b, "utf8");
  return A.length === B.length && timingSafeEqual(A, B);
}
/** Checkout handler signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyRazorpayPaymentSignature(orderId: string, paymentId: string, signature: string, keySecret: string): boolean {
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeHexEqual(expected, signature);
}
/** Webhook signature: HMAC_SHA256(raw request body, webhook_secret) in X-Razorpay-Signature. */
export function verifyRazorpayWebhookSignature(rawBody: string, signature: string, webhookSecret: string): boolean {
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return safeHexEqual(expected, signature);
}
