"use client";
import Link from "next/link";
import { api, useData } from "@/lib/client";
import { dateTime } from "@/lib/shared/format";
import { Empty, LoadFailure, Spinner } from "@/lib/shared/ui";
import { usePartner } from "@/components/Partner";

type N = { _id: string; title: string; body: string; link?: string; read: boolean; createdAt: string };
export default function NotificationsPage() {
  const { t, locale } = usePartner();
  const { data, error, reload } = useData<{ notifications: N[]; unread: number }>("me/notifications");
  if (!data) return error ? <LoadFailure message={error} onRetry={reload} /> : <Spinner label={t.common.loading} />;
  return (
    <div className="grid gap-4"><div className="flex items-center gap-3"><h1 className="text-2xl mr-auto">{t.nav.notifications}</h1>{data.unread > 0 && <button className="btn btn-sm btn-outline" onClick={async () => { await api("me/notifications", "PATCH", { all: true }); reload(); }}>✓</button>}</div>
      {data.notifications.length === 0 ? <Empty title="—" /> : <ul className="panel divide-y divide-[var(--color-line)]">{data.notifications.map((n) => (
        <li key={n._id} className={`p-4 grid gap-1 ${n.read ? "" : "bg-[var(--color-teal-50)]"}`}><p className="font-semibold">{n.title}</p><p>{n.body}</p><p className="muted text-sm">{dateTime(n.createdAt, locale)}{n.link && <> · <Link className="underline" href={n.link}>Open</Link></>}</p></li>
      ))}</ul>}
    </div>
  );
}
