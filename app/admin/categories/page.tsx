"use client";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Category } from "@/lib/core/types";
import { useData } from "@/lib/client";
import { Spinner, StatusBadge } from "@/lib/shared/ui";
export default function Categories() {
  const { data } = useData<{ categories: Category[] }>("admin/categories");
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3"><h1 className="text-2xl mr-auto">Categories</h1><Link className="btn btn-primary btn-sm" href="/admin/categories/new"><Plus aria-hidden size={16} />New category</Link></div>
      <p className="muted max-w-[80ch]">Each category has its own partner questions, booking questions, verification rules, cancellation policy and safety text. A new vertical goes live as soon as it is Active.</p>
      {!data ? <Spinner label="Loading…" /> : <ul className="panel divide-y divide-[var(--color-line)]">{data.categories.map((c) => <li key={c._id}><Link href={`/admin/categories/${c._id}`} className="p-4 flex gap-3 items-center hover:bg-[var(--color-teal-50)]"><span className="flex-1"><span className="font-semibold block">{c.name.en} <span className="muted font-normal">/ {c.name.hi}</span></span><span className="muted text-sm">/{c.slug} · {c.onboardingFields.length} partner questions · {c.bookingFields.length} booking questions</span></span><StatusBadge status={c.status === "active" ? "approved" : "draft"} label={c.status} />{!c.visible && <span className="badge">hidden</span>}</Link></li>)}</ul>}
    </div>
  );
}
