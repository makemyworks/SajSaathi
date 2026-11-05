import { publicProviderCard } from "@/lib/core/catalog";
import type { Provider } from "@/lib/core/types";
import { getCtx } from "@/lib/server/ctx";
import { currentUser, dict, locale } from "@/lib/session";
import { Empty } from "@/lib/shared/ui";
import { ProviderRow } from "@/components/ProviderRow";

export default async function FavouritesPage() {
  const [u, ctx, t, lang] = await Promise.all([currentUser(), getCtx(), dict(), locale()]);
  const ps = u?.favourites?.length ? await ctx.repo.col<Provider>("providers").find({ _id: { $in: u.favourites }, status: "approved" }) : [];
  return <div className="grid gap-4"><h2>{t.account.favourites}</h2>{ps.length === 0 ? <Empty title={t.account.noFavourites} /> : <ul className="panel px-4">{ps.map((p) => <ProviderRow key={p._id} p={publicProviderCard(p)} t={t} locale={lang} />)}</ul>}</div>;
}
