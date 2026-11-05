import type { Review, Provider } from "@/lib/core/types";
import { getCtx } from "@/lib/server/ctx";
import { currentActor, dict, locale } from "@/lib/session";
import { dateOnly } from "@/lib/shared/format";
import { Empty, Stars } from "@/lib/shared/ui";

export default async function MyReviews() {
  const [a, ctx, t, lang] = await Promise.all([currentActor(), getCtx(), dict(), locale()]);
  const rs = await ctx.repo.col<Review>("reviews").find({ customerId: a!.userId }, { sort: { createdAt: -1 } });
  const ps = rs.length ? await ctx.repo.col<Provider>("providers").find({ _id: { $in: rs.map((r) => r.providerId) } }) : [];
  return <div className="grid gap-4"><h2>{t.account.reviews}</h2>{rs.length === 0 ? <Empty title={t.provider.noReviews} /> : (
    <ul className="panel divide-y divide-[var(--color-line)]">{rs.map((r) => <li key={r._id} className="p-4 grid gap-1"><p className="font-semibold">{ps.find((p) => p._id === r.providerId)?.businessName}</p><div className="flex gap-3 items-center"><Stars value={r.rating} count={1} /><span className="muted text-sm">{dateOnly(r.createdAt, lang)}</span>{r.status !== "published" && <span className="badge">{r.status}</span>}</div>{r.text && <p>{r.text}</p>}{r.reply && <p className="pl-3 border-l-2 border-[var(--color-gold)]">{r.reply.text}</p>}</li>)}</ul>
  )}</div>;
}
