import { randomBytes, randomInt } from "node:crypto";

/** Typed application error; API routes turn it into { error: { code, message } } with the given HTTP status. */
export class AppError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}
export const notFound = (what = "Resource") => new AppError(404, "not_found", `${what} not found`);
export const forbidden = (msg = "You do not have permission to do this") => new AppError(403, "forbidden", msg);
export const badRequest = (msg: string, details?: unknown) => new AppError(400, "bad_request", msg, details);
export const conflict = (code: string, msg: string) => new AppError(409, code, msg);

/** 24-char hex ids, compatible in shape with MongoDB ObjectIds but generated in app code. */
export function newId(): string {
  const ts = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");
  return ts + randomBytes(8).toString("hex");
}

const REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I
export function humanRef(prefix: string): string {
  const pick = (n: number) => Array.from({ length: n }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join("");
  return `${prefix}-${pick(4)}-${pick(4)}`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ऀ-ॿ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ---------------- Money ----------------
export function formatINR(paise: number, locale = "en-IN"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "INR", maximumFractionDigits: paise % 100 === 0 ? 0 : 2 }).format(paise / 100);
}
export const rupees = (r: number) => Math.round(r * 100);

// ---------------- Indian formats ----------------
export const PIN_RE = /^[1-9][0-9]{5}$/;
export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let d = digits.startsWith("+") ? digits.slice(1) : digits;
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (!/^[6-9]\d{9}$/.test(d)) return null;
  return "+91" + d;
}
export function maskPhone(e164?: string): string | undefined {
  if (!e164) return undefined;
  return e164.slice(0, 3) + " ••••• " + e164.slice(-3);
}

// ---------------- Time zones (no dependencies) ----------------
/** Offset (minutes) of `tz` relative to UTC at instant `d`. Asia/Kolkata → +330. */
export function tzOffsetMinutes(tz: string, d: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(d)
    .reduce<Record<string, string>>((a, p) => ((a[p.type] = p.value), a), {});
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUTC - d.getTime()) / 60000);
}
/** Converts a wall-clock date ("2026-11-02") and time ("10:30") in `tz` to a UTC Date. */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const off1 = tzOffsetMinutes(tz, guess);
  const res = new Date(guess.getTime() - off1 * 60000);
  const off2 = tzOffsetMinutes(tz, res);
  return off1 === off2 ? res : new Date(guess.getTime() - off2 * 60000);
}
/** Local calendar parts of a UTC instant in `tz`. */
export function zonedParts(d: Date, tz: string): { date: string; time: string; weekday: number; minutes: number } {
  const off = tzOffsetMinutes(tz, d);
  const local = new Date(d.getTime() + off * 60000);
  const date = local.toISOString().slice(0, 10);
  const time = local.toISOString().slice(11, 16);
  return { date, time, weekday: local.getUTCDay(), minutes: local.getUTCHours() * 60 + local.getUTCMinutes() };
}
export function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const hhmmToMin = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
export const minToHhmm = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Removes keys whose value is undefined (MongoDB stores them as null otherwise). */
export function compact<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}
