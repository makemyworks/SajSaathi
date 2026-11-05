"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function AccountNav({ items }: { items: [string, string][] }) {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="flex lg:flex-col gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {items.map(([href, label]) => <Link key={href} href={href} aria-current={path.startsWith(href) ? "page" : undefined} className="chip shrink-0 lg:!rounded-[var(--radius-field)] lg:justify-start">{label}</Link>)}
    </nav>
  );
}
