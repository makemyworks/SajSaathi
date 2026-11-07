"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, MapPin, Scissors, Store } from "lucide-react";
import { useI18n } from "./I18n";

/** Accessible, mobile-first discovery form. Every field maps to the existing provider search API. */
export function HeroSearch({ categories, cities }: { categories: { slug: string; name: { en: string; hi?: string } }[]; cities: string[] }) {
  const { t, pick, locale } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [city, setCity] = useState("");

  return (
    <form
      role="search"
      className="ss-search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = new URLSearchParams();
        if (query.trim()) q.set("q", query.trim());
        if (cat) q.set("category", cat);
        if (city.trim()) { if (/^\d{6}$/.test(city.trim())) q.set("pin", city.trim()); else q.set("city", city.trim()); }
        const params = q.toString();
        router.push(params ? `/providers?${params}` : "/providers");
      }}
    >
      <div className="ss-search-fields">
        <label className="ss-search-field">
          <span><Store size={16} /> {locale === "hi" ? "सेवा या सैलून" : "Service or salon"}</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={locale === "hi" ? "जैसे हेयरकट, फेशियल" : "e.g. haircut, facial"} autoComplete="off" maxLength={80} />
        </label>
        <label className="ss-search-field">
          <span><Scissors size={16} /> {t.search.category}</span>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">{t.hero.anyService}</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{pick(c.name)}</option>)}
          </select>
        </label>
        <label className="ss-search-field">
          <span><MapPin size={16} /> {t.search.city} / PIN</span>
          <input list="ss-home-cities" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t.hero.anyCity} autoComplete="address-level2" maxLength={80} />
          <datalist id="ss-home-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
      </div>
      <button className="ss-search-submit" type="submit"><Search size={19} />{t.hero.find}<span aria-hidden="true" className="ss-search-arrow">→</span></button>
    </form>
  );
}
