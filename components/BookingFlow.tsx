"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Home, Store } from "lucide-react";
import type { PublicProvider } from "@/lib/provider-page";
import type { FieldDef } from "@/lib/core/types";
import { inr, istDate, dayLabel } from "@/lib/shared/format";
import { Notice, Spinner } from "@/lib/shared/ui";
import { useI18n } from "./I18n";
import { DynamicField } from "./DynamicField";
import { payForBooking } from "./razorpay";

type Slot = { time: string; start: string; end: string; staffIds: string[] };
type Quote = { basePaise: number; addOnsPaise: number; travelPaise: number; bookingFeePaise: number; taxPaise: number; discountPaise: number; totalPaise: number; durationMin: number; coupon?: { ok: boolean; reason?: string } };
type Addr = { id?: string; label?: string; line1: string; line2?: string; locality?: string; landmark?: string; city: string; state: string; pin: string };

export function BookingFlow({ provider: p, initialServiceId, initialDate, user, addresses, onlinePayments }: {
  provider: PublicProvider; initialServiceId?: string; initialDate?: string;
  user: { name: string; phone?: string } | null; addresses: Addr[]; onlinePayments: boolean;
}) {
  const { t, fmt, pick, locale } = useI18n();
  const router = useRouter();
  const [serviceId, setServiceId] = useState(initialServiceId && p.services.some((s) => s.id === initialServiceId) ? initialServiceId : p.services[0]?.id);
  const service = p.services.find((s) => s.id === serviceId)!;
  const category = p.categories.find((c) => c.id === service?.categoryId) ?? p.categories[0];
  const [addOns, setAddOns] = useState<string[]>([]);
  const canStore = p.inStore && service?.mode !== "at_home" && category?.inStoreAllowed;
  const canHome = p.atHome && service?.mode !== "in_store" && category?.atHomeAllowed;
  const [mode, setMode] = useState<"in_store" | "at_home">(canStore ? "in_store" : "at_home");
  const staffForService = p.staff.filter((s) => !s.serviceIds.length || s.serviceIds.includes(serviceId));
  const [staffId, setStaffId] = useState("");
  const maxDays = Math.min(category?.bookingRules.maxAdvanceDays ?? 30, 60);
  const dates = useMemo(() => Array.from({ length: Math.min(maxDays + 1, 21) }, (_, i) => istDate(i)), [maxDays]);
  const [date, setDate] = useState(initialDate && dates.includes(initialDate) ? initialDate : dates[0]);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const [addr, setAddr] = useState<Addr>(addresses[0] ?? { line1: "", city: p.city ?? "", state: "", pin: "" });
  const [notes, setNotes] = useState("");
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [pay, setPay] = useState<"pay_at_venue" | "online">("pay_at_venue");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (mode === "in_store" && !canStore && canHome) setMode("at_home"); if (mode === "at_home" && !canHome && canStore) setMode("in_store"); }, [serviceId, canStore, canHome, mode]);
  useEffect(() => { setAddOns([]); setStaffId(""); }, [serviceId]);

  // Free times (advisory; the server re-checks when booking)
  useEffect(() => {
    if (!serviceId) return;
    let live = true;
    setSlots(null); setSlot(null);
    const q = new URLSearchParams({ serviceId, date, mode, addOns: addOns.join(","), ...(staffId ? { staffId } : {}) });
    fetch(`/api/v1/providers/${p.slug}/slots?${q}`).then((r) => r.json()).then((j) => { if (live) setSlots(j.slots ?? []); }).catch(() => live && setSlots([]));
    return () => { live = false; };
  }, [p.slug, serviceId, date, mode, addOns, staffId]);

  // Price (always from the server)
  useEffect(() => {
    if (!serviceId) return;
    let live = true;
    fetch("/api/v1/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId: p.id, serviceId, addOnIds: addOns, mode, couponCode: appliedCoupon || undefined }) })
      .then((r) => r.json()).then((j) => { if (live && j.quote) setQuote(j.quote); });
    return () => { live = false; };
  }, [p.id, serviceId, addOns, mode, appliedCoupon]);

  if (!service) return <Notice tone="warn">{t.search.empty}</Notice>;
  const bookingFields = (category?.bookingFields ?? []) as FieldDef[];
  const needsConsent = !!category?.bookingRules.requiresConsent;

  async function submit() {
    setError("");
    if (!navigator.onLine) { setError(t.booking.offlineBlocked); return; }
    if (!slot) { setError(t.booking.chooseTime); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/v1/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: p.id, serviceId, staffId: staffId || undefined, start: slot.start, addOnIds: addOns, mode, address: mode === "at_home" ? { ...addr, id: undefined, label: undefined, country: "IN" } : undefined, fields, notes: notes || undefined, couponCode: appliedCoupon || undefined, paymentMethod: pay, consent: needsConsent ? consent : undefined }),
      });
      const j = await res.json();
      if (!res.ok) {
        if (j.error?.code === "slot_taken" || j.error?.code === "slot_unavailable") { setError(t.booking.slotTaken); setSlots(null); const again = await fetch(`/api/v1/providers/${p.slug}/slots?${new URLSearchParams({ serviceId, date, mode, addOns: addOns.join(",") })}`).then((r) => r.json()); setSlots(again.slots ?? []); setSlot(null); }
        else setError(j.error?.message ?? t.common.error);
        return;
      }
      if (pay === "online") await payForBooking(j.booking.id, { name: user?.name, phone: user?.phone, description: `${service.name} · ${p.name}` });
      router.push(`/book/confirmation/${j.booking.id}`);
    } catch {
      setError(t.common.error);
    } finally {
      setBusy(false);
    }
  }

  const section = "panel p-5 grid gap-4";
  return (
    <div className="grid gap-5">
      <section className={section} aria-labelledby="b-svc">
        <h2 id="b-svc" className="text-xl">{t.booking.chooseService}</h2>
        <div role="radiogroup" aria-labelledby="b-svc" className="grid gap-2">
          {p.services.map((s) => (
            <label key={s.id} className={`flex items-center gap-3 p-3 rounded-[var(--radius-field)] border cursor-pointer ${s.id === serviceId ? "border-[var(--color-teal-800)] bg-[var(--color-teal-50)]" : "border-[var(--color-line)]"}`}>
              <input type="radio" name="service" className="size-5 accent-[var(--color-teal-800)]" checked={s.id === serviceId} onChange={() => setServiceId(s.id)} />
              <span className="flex-1"><span className="font-semibold block">{s.name}</span><span className="muted text-[0.95rem]">{fmt(t.provider.minutes, { n: s.durationMin })}</span></span>
              <strong className="tabular-nums">{inr(s.pricePaise, locale)}</strong>
            </label>
          ))}
        </div>
        {service.addOns.length > 0 && (
          <fieldset className="grid gap-2"><legend className="font-semibold mb-1">{t.provider.addOns}</legend>
            {service.addOns.map((a) => (
              <label key={a.id} className="flex items-center gap-3"><input type="checkbox" className="size-5 accent-[var(--color-teal-800)]" checked={addOns.includes(a.id)} onChange={(e) => setAddOns(e.target.checked ? [...addOns, a.id] : addOns.filter((x) => x !== a.id))} /><span className="flex-1">{a.name}{a.durationMin ? <span className="muted"> · +{a.durationMin} min</span> : null}</span><span className="tabular-nums">+{inr(a.pricePaise, locale)}</span></label>
            ))}
          </fieldset>
        )}
      </section>

      {(canStore && canHome) && (
        <section className={section} aria-labelledby="b-where">
          <h2 id="b-where" className="text-xl">{t.booking.chooseWhere}</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            <button type="button" aria-pressed={mode === "in_store"} onClick={() => setMode("in_store")} className="chip justify-start !rounded-[var(--radius-field)] !min-h-14"><Store aria-hidden size={18} />{fmt(t.booking.atProvider, { name: p.name })}</button>
            <button type="button" aria-pressed={mode === "at_home"} onClick={() => setMode("at_home")} className="chip justify-start !rounded-[var(--radius-field)] !min-h-14"><Home aria-hidden size={18} />{t.booking.atMyHome}{p.travelFeePaise ? ` (+${inr(p.travelFeePaise, locale)})` : ""}</button>
          </div>
        </section>
      )}

      <section className={section} aria-labelledby="b-when">
        <h2 id="b-when" className="text-xl">{t.booking.chooseDate}</h2>
        {staffForService.length > 1 && (
          <label className="field"><span>{t.booking.professional}</span>
            <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">{t.booking.anyProfessional}</option>
              {staffForService.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}
            </select>
          </label>
        )}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x" role="radiogroup" aria-label={t.booking.chooseDate}>
          {dates.map((d) => { const l = dayLabel(d, locale); const on = d === date; return (
            <button key={d} type="button" role="radio" aria-checked={on} onClick={() => setDate(d)} className={`snap-start shrink-0 w-16 py-2 rounded-[var(--radius-field)] border grid justify-items-center ${on ? "bg-[var(--color-teal-800)] text-white border-[var(--color-teal-800)]" : "bg-white border-[var(--color-line)]"}`}>
              <span className="text-sm">{l.day}</span><span className="text-xl font-semibold tabular-nums">{l.num}</span><span className="text-xs">{l.month}</span>
            </button>
          ); })}
        </div>
        <div aria-live="polite">
          {slots === null ? <Spinner label={t.booking.loadingSlots} /> : slots.length === 0 ? <p className="muted">{t.booking.noSlots}</p> : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2" role="radiogroup" aria-label={t.booking.chooseTime}>
              {slots.map((s) => <button key={s.start} type="button" role="radio" aria-checked={slot?.start === s.start} onClick={() => setSlot(s)} className={`min-h-12 rounded-[var(--radius-field)] border tabular-nums font-semibold ${slot?.start === s.start ? "bg-[var(--color-teal-800)] text-white border-[var(--color-teal-800)]" : "bg-white border-[var(--color-line)] hover:border-[var(--color-teal-700)]"}`}>{s.time}</button>)}
            </div>
          )}
        </div>
      </section>

      {(bookingFields.length > 0 || mode === "at_home") && (
        <section className={section} aria-labelledby="b-det">
          <h2 id="b-det" className="text-xl">{t.booking.details}</h2>
          {bookingFields.map((f) => <DynamicField key={f.key} f={f} value={fields[f.key]} onChange={(v) => setFields({ ...fields, [f.key]: v })} />)}
          {mode === "at_home" && (
            <fieldset className="grid gap-3"><legend className="font-semibold mb-1">{t.booking.address}</legend>
              {addresses.length > 0 && (
                <div className="flex flex-wrap gap-2">{addresses.map((a) => <button key={a.id} type="button" className="chip" aria-pressed={addr.id === a.id} onClick={() => setAddr(a)}>{a.label || a.locality || a.line1}</button>)}</div>
              )}
              <label className="field"><span>{t.booking.addressLine}</span><input className="input" autoComplete="address-line1" value={addr.line1} onChange={(e) => setAddr({ ...addr, id: undefined, line1: e.target.value })} /></label>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="field"><span>{t.booking.locality}</span><input className="input" value={addr.locality ?? ""} onChange={(e) => setAddr({ ...addr, id: undefined, locality: e.target.value })} /></label>
                <label className="field"><span>{t.booking.landmark}</span><input className="input" value={addr.landmark ?? ""} onChange={(e) => setAddr({ ...addr, id: undefined, landmark: e.target.value })} /></label>
                <label className="field"><span>{t.booking.city}</span><input className="input" autoComplete="address-level2" value={addr.city} onChange={(e) => setAddr({ ...addr, id: undefined, city: e.target.value })} /></label>
                <label className="field"><span>{t.booking.state}</span><input className="input" autoComplete="address-level1" value={addr.state} onChange={(e) => setAddr({ ...addr, id: undefined, state: e.target.value })} /></label>
                <label className="field"><span>{t.booking.pin}</span><input className="input" inputMode="numeric" maxLength={6} pattern="[1-9][0-9]{5}" autoComplete="postal-code" value={addr.pin} onChange={(e) => setAddr({ ...addr, id: undefined, pin: e.target.value.replace(/\D/g, "") })} /></label>
              </div>
              {p.serviceAreaPins.length > 0 && addr.pin.length === 6 && !p.serviceAreaPins.includes(addr.pin) && <Notice tone="warn">{t.provider.serviceArea}: {p.serviceAreaPins.join(", ")}</Notice>}
            </fieldset>
          )}
          <label className="field"><span>{t.booking.notes}</span><textarea className="input" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        </section>
      )}

      <section className={section} aria-labelledby="b-sum">
        <h2 id="b-sum" className="text-xl">{t.booking.summary}</h2>
        {quote ? (
          <table className="w-full"><tbody className="[&_td]:py-1 [&_td:last-child]:text-right [&_td:last-child]:tabular-nums">
            <tr><td>{t.booking.service}</td><td>{inr(quote.basePaise, locale)}</td></tr>
            {quote.addOnsPaise > 0 && <tr><td>{t.booking.addOns}</td><td>{inr(quote.addOnsPaise, locale)}</td></tr>}
            {quote.travelPaise > 0 && <tr><td>{t.booking.travel}</td><td>{inr(quote.travelPaise, locale)}</td></tr>}
            {quote.bookingFeePaise > 0 && <tr><td>{t.booking.fee}</td><td>{inr(quote.bookingFeePaise, locale)}</td></tr>}
            {quote.taxPaise > 0 && <tr><td>{t.booking.tax}</td><td>{inr(quote.taxPaise, locale)}</td></tr>}
            {quote.discountPaise > 0 && <tr className="text-[var(--color-ok)]"><td>{t.booking.discount} ({appliedCoupon})</td><td>−{inr(quote.discountPaise, locale)}</td></tr>}
            <tr className="border-t border-[var(--color-line)] text-lg"><td className="pt-2 font-semibold">{t.booking.total}</td><td className="pt-2 font-bold">{inr(quote.totalPaise, locale)}</td></tr>
          </tbody></table>
        ) : <Spinner label={t.common.loading} />}
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setAppliedCoupon(coupon.trim().toUpperCase()); }}>
          <label className="sr-only" htmlFor="coupon">{t.booking.coupon}</label>
          <input id="coupon" className="input" placeholder={t.booking.coupon} value={coupon} onChange={(e) => setCoupon(e.target.value)} autoCapitalize="characters" />
          <button className="btn btn-outline" type="submit">{t.booking.apply}</button>
        </form>
        {appliedCoupon && quote?.coupon && (quote.coupon.ok ? <p className="text-[var(--color-ok)] inline-flex items-center gap-1"><Check aria-hidden size={16} />{t.booking.couponApplied}</p> : <p className="text-[var(--color-bad)]">{quote.coupon.reason}</p>)}

        <fieldset className="grid gap-2"><legend className="font-semibold mb-1">{t.booking.pay}</legend>
          <label className="flex items-center gap-3"><input type="radio" name="pay" className="size-5 accent-[var(--color-teal-800)]" checked={pay === "pay_at_venue"} onChange={() => setPay("pay_at_venue")} />{t.booking.payVenue}</label>
          {onlinePayments ? <label className="flex items-center gap-3"><input type="radio" name="pay" className="size-5 accent-[var(--color-teal-800)]" checked={pay === "online"} onChange={() => setPay("online")} />{t.booking.payOnline}</label> : <p className="muted text-[0.95rem]">{t.booking.payOnlineOff}</p>}
        </fieldset>

        {needsConsent && category?.bookingRules.consentText && (
          <div className="rounded-[var(--radius-field)] bg-[var(--color-teal-50)] p-4 grid gap-2">
            <p className="font-semibold">{t.booking.consentTitle}</p>
            <p className="text-[0.95rem]">{pick(category.bookingRules.consentText)}</p>
            <label className="flex items-center gap-3 font-semibold"><input type="checkbox" className="size-5 accent-[var(--color-teal-800)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />{t.booking.consentAgree}</label>
          </div>
        )}

        {error && <Notice tone="bad">{error}</Notice>}
        {user ? (
          <button type="button" className="btn btn-primary btn-xl" disabled={busy || !slot || (needsConsent && !consent)} onClick={submit}>{busy ? t.booking.confirming : t.booking.confirm}</button>
        ) : (
          <Link className="btn btn-primary btn-xl" href={`/login?next=${encodeURIComponent(`/book/${p.slug}?service=${serviceId}&date=${date}`)}`}>{t.booking.loginToBook}</Link>
        )}
        {slot && <p className="muted text-[0.95rem] text-center">{dayLabel(date, locale).day} {dayLabel(date, locale).num} {dayLabel(date, locale).month}, {slot.time}{quote ? ` · ${fmt(t.provider.minutes, { n: quote.durationMin })}` : ""}</p>}
      </section>
    </div>
  );
}
