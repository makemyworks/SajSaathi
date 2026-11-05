export function inr(paise: number | undefined | null, locale = "en-IN"): string {
  if (paise == null || !Number.isFinite(paise)) return "—";
  return new Intl.NumberFormat(locale === "hi" ? "hi-IN" : "en-IN", { style: "currency", currency: "INR", maximumFractionDigits: paise % 100 === 0 ? 0 : 2 }).format(paise / 100);
}
const TZ = "Asia/Kolkata";
export function dateTime(d: string | Date | undefined, locale = "en"): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(d));
}
export function dateOnly(d: string | Date | undefined, locale = "en"): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
}
export function timeOnly(d: string | Date, locale = "en"): string {
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(d));
}
/** YYYY-MM-DD for "today + n" in India. */
export function istDate(offsetDays = 0): string {
  const d = new Date(Date.now() + 330 * 60000 + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}
export function dayLabel(date: string, locale = "en"): { day: string; num: string; month: string } {
  const d = new Date(date + "T12:00:00+05:30");
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { timeZone: TZ, ...o }).format(d);
  return { day: f({ weekday: "short" }), num: f({ day: "numeric" }), month: f({ month: "short" }) };
}
export const statusTone: Record<string, string> = {
  pending: "badge-warn", confirmed: "badge-ok", rescheduled: "badge-teal", in_progress: "badge-teal", completed: "badge-ok",
  cancelled: "badge-bad", refund_pending: "badge-warn", refunded: "", no_show: "badge-bad",
  approved: "badge-ok", submitted: "badge-warn", under_review: "badge-warn", documents_required: "badge-warn", rejected: "badge-bad", suspended: "badge-bad", draft: "",
  captured: "badge-ok", failed: "badge-bad", authorized: "badge-teal", created: "badge-warn", unpaid: "badge-warn", not_required: "",
};
