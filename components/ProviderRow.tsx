import Link from "next/link";
import { BadgeCheck, Home, Store } from "lucide-react";
import { Stars } from "@/lib/shared/ui";
import { inr } from "@/lib/shared/format";
import { fmt, type Dict } from "@/lib/shared/i18n";

export interface ProviderCardData {
  id: string; slug: string; name: string; verified: boolean; locality?: string; city?: string;
  atHome: boolean; inStore: boolean; ratingAvg: number; ratingCount: number; photo?: string;
  sponsored?: boolean; fromPricePaise?: number; topServices?: { id: string; name: string; pricePaise: number; durationMin: number }[];
}

/** A list row, not a card grid: name and place lead, services and prices underneath, one clear action. */
export function ProviderRow({ p, t, locale }: { p: ProviderCardData; t: Dict; locale: string }) {
  return (
    <li className="py-5 border-b border-[var(--color-line)] last:border-0 grid grid-cols-[64px_1fr] sm:grid-cols-[88px_1fr_auto] gap-x-4 gap-y-3 items-start">
      <div className="size-16 sm:size-[88px] rounded-xl overflow-hidden bg-[var(--color-teal-50)] grid place-items-center">
        {p.photo ? <img src={p.photo} alt="" loading="lazy" width={88} height={88} className="size-full object-cover" /> : <img src="/brand/logo-symbol.svg" alt="" width={36} height={36} className="opacity-60" />}
      </div>
      <div className="min-w-0 grid gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/p/${p.slug}`} className="font-display text-xl font-semibold text-[var(--color-teal-900)] hover:underline underline-offset-4" style={{ fontFamily: "var(--font-display)" }}>{p.name}</Link>
          {p.verified && <span className="badge badge-teal"><BadgeCheck aria-hidden size={14} />{t.search.verified}</span>}
          {p.sponsored && <span className="badge">{t.search.sponsored}</span>}
        </div>
        <p className="muted">{[p.locality, p.city].filter(Boolean).join(", ")}</p>
        <div className="flex items-center gap-4 flex-wrap text-[0.95rem]">
          {p.ratingCount > 0 ? <Stars value={p.ratingAvg} count={p.ratingCount} label={fmt(t.search.reviews, { n: p.ratingCount })} /> : <span className="badge">{t.search.newProvider}</span>}
          {p.inStore && <span className="inline-flex items-center gap-1 muted"><Store aria-hidden size={16} />{t.search.inStore}</span>}
          {p.atHome && <span className="inline-flex items-center gap-1 muted"><Home aria-hidden size={16} />{t.search.atHome}</span>}
        </div>
        {!!p.topServices?.length && (
          <ul className="mt-1 grid gap-1 text-[0.95rem]">
            {p.topServices.map((s) => (
              <li key={s.id} className="flex justify-between gap-3 max-w-md"><span className="truncate">{s.name}</span><span className="tabular-nums font-semibold">{inr(s.pricePaise, locale)}</span></li>
            ))}
          </ul>
        )}
      </div>
      <div className="col-span-2 sm:col-span-1 flex sm:flex-col items-center sm:items-end gap-3 justify-between">
        {p.fromPricePaise !== undefined && Number.isFinite(p.fromPricePaise) && <span className="muted text-[0.95rem]">{t.search.from} <strong className="text-[var(--color-ink)]">{inr(p.fromPricePaise, locale)}</strong></span>}
        <Link href={`/book/${p.slug}`} className="btn btn-primary btn-sm">{t.provider.book}</Link>
      </div>
    </li>
  );
}
