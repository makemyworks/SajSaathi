import { getCtx } from "@/lib/server/ctx";
import { dict, locale } from "@/lib/session";
import { inr } from "@/lib/shared/format";
import { Empty } from "@/lib/shared/ui";

/** Shows memberships only when the founder has enabled the feature flag and created active plans. Purchase is not built yet. */
export default async function MembershipsPage() {
  const [ctx, t, lang] = await Promise.all([getCtx(), dict(), locale()]);
  const flag = await ctx.repo.col<{ _id: string; key: string; enabled: boolean }>("feature_flags").findOne({ key: "memberships" });
  const plans = flag?.enabled ? await ctx.repo.col<{ _id: string; name: string; description?: string; pricePaise?: number; interval?: string; benefits?: string[] }>("memberships").find({ active: true }, { sort: { pricePaise: 1 } }) : [];
  return <div className="grid gap-4"><h2>{t.account.memberships}</h2>
    {plans.length === 0 ? <Empty title={t.account.memberships} body="Memberships are not available yet. We'll let you know when they launch." /> : (
      <ul className="grid sm:grid-cols-2 gap-3">{plans.map((m) => <li key={m._id} className="panel p-5 grid gap-2"><p className="font-semibold text-lg">{m.name}</p>{m.description && <p className="muted">{m.description}</p>}<p className="text-xl font-semibold tabular-nums">{inr(m.pricePaise, lang)} <span className="muted text-base font-normal">/ {m.interval}</span></p>{m.benefits?.length ? <ul className="list-disc pl-5">{m.benefits.map((b) => <li key={b}>{b}</li>)}</ul> : null}<p className="muted text-sm">Joining opens soon.</p></li>)}</ul>
    )}
  </div>;
}
