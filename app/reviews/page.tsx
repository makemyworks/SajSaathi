"use client";
import type { Review } from "@/lib/core/types";
import { api, useData } from "@/lib/client";
import { dateOnly } from "@/lib/shared/format";
import { Empty, LoadFailure, Spinner, Stars } from "@/lib/shared/ui";
import { usePartner } from "@/components/Partner";

export default function ReviewsPage() {
  const { t, locale } = usePartner();
  const { data, error, reload } = useData<{ reviews: Review[] }>("partner/reviews");
  if (!data) return error ? <LoadFailure message={error} onRetry={reload} /> : <Spinner label={t.common.loading} />;
  return (
    <div className="grid gap-4"><h1 className="text-2xl">{t.reviews.title}</h1>
      {data.reviews.length === 0 ? <Empty title={t.reviews.empty} /> : <ul className="grid gap-3">{data.reviews.map((r) => (
        <li key={r._id} className="panel p-4 grid gap-2">
          <div className="flex gap-3 items-center"><Stars value={r.rating} count={1} /><span className="font-semibold">{r.customerName.split(" ")[0]}</span><span className="muted text-sm">{dateOnly(r.createdAt, locale)}</span></div>
          {r.text && <p>{r.text}</p>}
          {r.reply ? <p className="pl-3 border-l-2 border-[var(--color-gold)]">{r.reply.text}</p> : (
            <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); await api(`partner/reviews/${r._id}`, "POST", { text: new FormData(e.currentTarget).get("text") }); reload(); }}><input name="text" className="input" required minLength={2} maxLength={600} placeholder={t.reviews.reply} /><button className="btn btn-outline">{t.reviews.send}</button></form>
          )}
        </li>
      ))}</ul>}
    </div>
  );
}
