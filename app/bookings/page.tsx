"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { useData } from "@/lib/client";
import { Empty, LoadFailure, Spinner } from "@/lib/shared/ui";
import { usePartner } from "@/components/Partner";
import { BookingCard, type BookingRow } from "@/components/BookingCard";

const TABS = ["pending", "today", "upcoming", "completed", "cancelled"] as const;
function List() {
  const { t } = usePartner();
  const sp = useSearchParams();
  const tab = (TABS as readonly string[]).includes(sp.get("tab") ?? "") ? (sp.get("tab") as (typeof TABS)[number]) : "pending";
  const { data, loading, error, reload } = useData<{ bookings: BookingRow[] }>(`partner/bookings?scope=${tab}`);
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3"><h1 className="text-2xl mr-auto">{t.bookings.title}</h1><Link href="/bookings/new" className="btn btn-primary btn-sm"><Plus aria-hidden size={18} />{t.bookings.walkIn}</Link></div>
      <nav className="flex gap-2 overflow-x-auto pb-1">{TABS.map((k) => <Link key={k} className="chip shrink-0" aria-current={k === tab ? "page" : undefined} href={`/bookings?tab=${k}`}>{t.bookings.tabs[k]}</Link>)}</nav>
      {!data ? (error ? <LoadFailure message={error} onRetry={reload} /> : loading ? <Spinner label={t.common.loading} /> : null) : data.bookings.length === 0 ? <Empty title={t.bookings.empty} /> : <ul className="grid gap-3">{data.bookings.map((b) => <BookingCard key={b._id} b={b} onChange={reload} showDate={tab !== "today"} />)}</ul>}
    </div>
  );
}
export default function Page() { return <Suspense><List /></Suspense>; }
