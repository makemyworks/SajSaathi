import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { getCtx } from "@/lib/server/ctx";
import { dateOnly } from "@/lib/shared/format";
export const metadata: Metadata = { title: "Offers" };
export const dynamic = "force-dynamic";
type Promo = { _id: string; title: string; body?: string; couponCode?: string; validTo?: Date };
export default async function Page() {
  const ctx = await getCtx();
  const list = (await ctx.repo.col<Promo>("promotions").find({ active: true }, { sort: { updatedAt: -1 } })).filter((p) => !p.validTo || p.validTo > new Date());
  return (
    <ContentPage slug="offers">
      {list.length === 0 ? <p className="muted">There are no offers right now. We only show offers that are actually available.</p> : (
        <ul className="grid gap-3">{list.map((p) => <li key={p._id} className="panel p-5 border-l-4 border-l-[var(--color-gold)] grid gap-1"><p className="font-semibold text-lg">{p.title}</p>{p.body && <p>{p.body}</p>}{p.couponCode && <p>Code: <strong className="tracking-wide">{p.couponCode}</strong></p>}{p.validTo && <p className="muted text-sm">Valid till {dateOnly(p.validTo)}</p>}</li>)}</ul>
      )}
    </ContentPage>
  );
}
