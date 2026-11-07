"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CreditCard, Heart, MessageSquare, Bell, MapPinned, Award, LifeBuoy, UserRound, Settings } from "lucide-react";
const icons = [CalendarDays, CreditCard, Heart, MessageSquare, Bell, MapPinned, Award, LifeBuoy, UserRound, Settings];
export function AccountNav({ items }: { items: [string, string][] }) {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="customer-account-nav">
      {items.map(([href, label], index) => {
        const Icon = icons[index] ?? UserRound;
        const current = path === href || path.startsWith(`${href}/`);
        return <Link key={href} href={href} aria-current={current ? "page" : undefined} className="chip shrink-0"><Icon aria-hidden size={16} />{label}</Link>;
      })}
    </nav>
  );
}
