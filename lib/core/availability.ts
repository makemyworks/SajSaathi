/**
 * Slot computation. This is advisory (used to draw the time picker); the authoritative check is
 * the slot lock written at booking time (see booking.ts → lockSlot), which uses a unique index so
 * two simultaneous requests for the same staff member and time can never both succeed.
 */
import type { Category, Provider, Service, Staff, WeeklyHours } from "./types";
import { addDays, hhmmToMin, minToHhmm, zonedParts, zonedToUtc } from "./util";

export const LOCK_UNIT_MIN = 5; // granularity of slot locks

export interface BusyInterval { start: Date; end: Date; resource: string }
export interface Slot { time: string; start: string; end: string; staffIds: string[] }

export function resourceKey(providerId: string, staffId?: string): string {
  return staffId ? `staff:${staffId}` : `provider:${providerId}`;
}
/** Every 5-minute unit an appointment occupies (inclusive of buffer). Each becomes a unique lock row. */
export function lockUnits(start: Date, end: Date, bufferMin: number): number[] {
  const from = Math.floor(start.getTime() / 60000 / LOCK_UNIT_MIN);
  const to = Math.ceil((end.getTime() + bufferMin * 60000) / 60000 / LOCK_UNIT_MIN);
  const out: number[] = [];
  for (let u = from; u < to; u++) out.push(u);
  return out;
}

function dayWindows(hours: WeeklyHours, weekday: number): [number, number][] {
  const d = hours[String(weekday) as keyof WeeklyHours];
  if (!d || !d.open) return [];
  return d.slots.map((s) => [hhmmToMin(s.start), hhmmToMin(s.end)] as [number, number]).filter(([a, b]) => b > a);
}

export interface SlotQuery {
  provider: Provider;
  service: Service;
  category: Category;
  staff: Staff[]; // active staff of the provider (may be empty for individuals)
  date: string; // YYYY-MM-DD in provider timezone
  durationMin: number; // service + add-ons
  busy: BusyInterval[];
  blocks: { start: Date; end: Date; staffId?: string }[];
  now: Date;
  staffId?: string; // customer picked a specific professional
}

export function computeSlots(q: SlotQuery): Slot[] {
  const tz = q.provider.timezone || "Asia/Kolkata";
  const rules = q.category.bookingRules;
  if (q.provider.holidays.includes(q.date)) return [];
  const lastDay = addDays(zonedParts(q.now, tz).date, rules.maxAdvanceDays);
  if (q.date > lastDay) return [];
  const weekday = new Date(q.date + "T12:00:00Z").getUTCDay();
  const earliest = q.now.getTime() + rules.minLeadMinutes * 60000;

  // Which resources can do this service?
  const eligible = q.staff.filter((s) => s.active && (s.serviceIds.length === 0 || s.serviceIds.includes(q.service._id)) && (q.service.staffIds.length === 0 || q.service.staffIds.includes(s._id)));
  const resources: { key: string; staffId?: string; hours: WeeklyHours }[] = eligible.length
    ? eligible.filter((s) => !q.staffId || s._id === q.staffId).map((s) => ({ key: resourceKey(q.provider._id, s._id), staffId: s._id, hours: s.hours ?? q.provider.hours }))
    : [{ key: resourceKey(q.provider._id), hours: q.provider.hours }];

  const step = rules.slotStepMinutes || 15;
  const byTime = new Map<string, Slot>();
  for (const r of resources) {
    // Provider-level hours always cap staff hours.
    const provWin = dayWindows(q.provider.hours, weekday);
    const staffWin = dayWindows(r.hours, weekday);
    const busy = q.busy.filter((b) => b.resource === r.key);
    const blocks = q.blocks.filter((b) => !b.staffId || b.staffId === r.staffId);
    for (const [ps, pe] of provWin) for (const [ss, se] of staffWin) {
      const ws = Math.max(ps, ss), we = Math.min(pe, se);
      for (let m = Math.ceil(ws / step) * step; m + q.durationMin <= we; m += step) {
        const start = zonedToUtc(q.date, minToHhmm(m), tz);
        const end = new Date(start.getTime() + q.durationMin * 60000);
        const endWithBuffer = new Date(end.getTime() + rules.bufferMinutes * 60000);
        if (start.getTime() < earliest) continue;
        const clash = (iv: { start: Date; end: Date }) => iv.start < endWithBuffer && start < new Date(iv.end.getTime() + rules.bufferMinutes * 60000);
        if (busy.some(clash) || blocks.some(clash)) continue;
        const t = minToHhmm(m);
        const slot = byTime.get(t) ?? { time: t, start: start.toISOString(), end: end.toISOString(), staffIds: [] };
        if (r.staffId) slot.staffIds.push(r.staffId);
        byTime.set(t, slot);
      }
    }
  }
  return [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time));
}
