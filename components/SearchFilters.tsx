"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { useI18n } from "./I18n";

/** Plain GET form so filters also work without JavaScript; category-relevant options only. */
export function SearchFilters({ categories, atHomeAllowed }: { categories: { slug: string; name: { en: string; hi?: string } }[]; atHomeAllowed: boolean }) {
  const { t, pick } = useI18n();
  const sp = useSearchParams();
  const router = useRouter();
  const v = (k: string) => sp.get(k) ?? "";
  return (
    <details className="panel" open>
      <summary className="list-none cursor-pointer px-4 py-3 font-semibold flex items-center gap-2"><SlidersHorizontal aria-hidden size={18} />{t.search.filters}</summary>
      <form
        className="px-4 pb-4 grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const q = new URLSearchParams();
          for (const [k, val] of fd.entries()) if (String(val)) q.set(k, String(val));
          if (v("date")) q.set("date", v("date"));
          router.push(`/providers?${q.toString()}`);
        }}
      >
        {v("q") && <input type="hidden" name="q" defaultValue={v("q")} />}
        <label className="field"><span>{t.search.category}</span>
          <select name="category" className="input" defaultValue={v("category")}>
            <option value="">{t.search.allCategories}</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{pick(c.name)}</option>)}
          </select>
        </label>
        <label className="field"><span>{t.search.city}</span><input name="city" className="input" defaultValue={v("city")} autoComplete="address-level2" /></label>
        <label className="field"><span>{t.search.pin}</span><input name="pin" className="input" inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} defaultValue={v("pin")} /></label>
        {atHomeAllowed && (
          <fieldset className="field"><legend className="font-semibold text-[0.95rem] mb-1">{t.search.mode}</legend>
            <select name="mode" className="input" defaultValue={v("mode")}>
              <option value="">{t.search.modeAny}</option><option value="in_store">{t.search.modeStore}</option><option value="at_home">{t.search.modeHome}</option>
            </select>
          </fieldset>
        )}
        <label className="field"><span>{t.search.rating}</span>
          <select name="rating" className="input" defaultValue={v("rating")}><option value="">{t.search.ratingAny}</option><option value="4">4+</option><option value="3">3+</option></select>
        </label>
        <label className="field"><span>{t.search.maxPrice}</span><input name="maxPrice" className="input" inputMode="numeric" pattern="[0-9]*" defaultValue={v("maxPrice")} /></label>
        <label className="field"><span>{t.search.sort}</span>
          <select name="sort" className="input" defaultValue={v("sort")}>
            <option value="">{t.search.sortRelevance}</option><option value="rating">{t.search.sortRating}</option><option value="price_low">{t.search.sortPriceLow}</option><option value="price_high">{t.search.sortPriceHigh}</option>
          </select>
        </label>
        <button className="btn btn-primary" type="submit">{t.search.apply}</button>
      </form>
    </details>
  );
}
