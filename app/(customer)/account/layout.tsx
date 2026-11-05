import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser, dict } from "@/lib/session";
import { LogoutButton } from "@/components/LogoutButton";
import { AccountNav } from "@/components/AccountNav";

export const dynamic = "force-dynamic";
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const [user, t] = await Promise.all([currentUser(), dict()]);
  if (!user) redirect("/login?next=/account");
  if (user.role !== "customer") return <div className="wrap py-10"><p>This area is for customers. <Link className="underline" href="/">Home</Link></p></div>;
  const items = [
    ["/account/bookings", t.account.bookings], ["/account/payments", t.account.payments], ["/account/favourites", t.account.favourites],
    ["/account/reviews", t.account.reviews], ["/account/notifications", t.account.notifications], ["/account/addresses", t.account.addresses],
    ["/account/memberships", t.account.memberships], ["/account/support", t.account.support], ["/account/profile", t.account.profile], ["/account/settings", t.account.settings],
  ] as [string, string][];
  return (
    <div className="wrap py-8 grid gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap"><h1>{user.name.split(" ")[0]}</h1><LogoutButton label={t.nav.logout} /></div>
      <div className="grid lg:grid-cols-[15rem_1fr] gap-6 items-start">
        <AccountNav items={items} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
