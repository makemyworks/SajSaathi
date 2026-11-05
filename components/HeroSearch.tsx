"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { useI18n } from "./I18n";
import { istDate, dayLabel } from "@/lib/shared/format";

/**
 * The signature element of the home page: the search reads as a sentence.
 * "I'm looking for [service] in [city] on [day]" — each blank is a real, labelled form control.
 */
export function HeroSearch({ categories, cities }: { categories: { slug: string; name: { en: string; hi?: string } }[]; cities: string[] }) {
  const { t, locale, pick } = useI18n();
  const router = useRouter();
  const [cat, setCat] = useState("");
  const [city, setCity] = useState("");
  const [day, setDay] = useState("");
  const days = Array.from({ length: 7 }, (_, i) => istDate(i));
  const blank = "appearance-none bg-transparent border-0 border-b-2 border-[var(--color-gold-light)] text-[var(--color-gold-light)] font-semibold px-1 py-0 rounded-none focus:outline-none focus:border-white cursor-pointer max-w-full";

  return (
    <form
      role="search"
      className="grid gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        const q = new URLSearchParams();
        if (cat) q.set("category", cat);
        if (city) { if (/^\d{6}$/.test(city)) q.set("pin", city); else q.set("city", city); }
        if (day) q.set("date", day);
        router.push(`/providers?${q.toString()}`);
      }}
    >
      <p className="text-[clamp(1.6rem,1rem+3.2vw,3.1rem)] leading-[1.35] text-white" style={{ fontFamily: "var(--font-display)" }}>
        {t.hero.lead}{" "}
        <label className="sr-only" htmlFor="hs-cat">{t.search.category}</label>
        <select id="hs-cat" className={blank} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="" className="text-[var(--color-ink)]">{t.hero.anyService}</option>
          {categories.map((c) => <option key={c.slug} value={c.slug} className="text-[var(--color-ink)]">{pick(c.name)}</option>)}
        </select>{" "}
        {t.hero.in}{" "}
        <label className="sr-only" htmlFor="hs-city">{t.search.city}</label>
        <input id="hs-city" list="hs-cities" className={`${blank} w-[7.5em] placeholder:text-[var(--color-gold-light)]/70`} placeholder={t.hero.anyCity} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
        <datalist id="hs-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>{" "}
        {t.hero.on}{" "}
        <label className="sr-only" htmlFor="hs-day">{t.booking.chooseDate}</label>
        <select id="hs-day" className={blank} value={day} onChange={(e) => setDay(e.target.value)}>
          <option value="" className="text-[var(--color-ink)]">{t.hero.anyDay}</option>
          {days.map((d) => { const l = dayLabel(d, locale); return <option key={d} value={d} className="text-[var(--color-ink)]">{`${l.day} ${l.num} ${l.month}`}</option>; })}
        </select>
      </p>
      <div><button className="btn btn-xl bg-[var(--color-gold-light)] text-[var(--color-teal-950)] hover:bg-white" type="submit"><Search aria-hidden size={20} />{t.hero.find}</button></div>
    </form>
  );
}
