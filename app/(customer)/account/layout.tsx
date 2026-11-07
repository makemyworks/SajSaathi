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
    <div className="wrap py-6 sm:py-8 grid gap-5">
      <div className="customer-account-heading">
        <div className="grid gap-1"><span className="section-kicker">{t.nav.account}</span><h1 className="text-2xl sm:text-3xl">Hello, {user.name.split(" ")[0]}</h1><p>Manage your appointments, saved places and account details from one place.</p></div>
        <LogoutButton label={t.nav.logout} />
      </div>
      <div className="grid lg:grid-cols-[15.5rem_minmax(0,1fr)] gap-5 items-start">
        <AccountNav items={items} />
        <div className="min-w-0 grid gap-4">{children}</div>
      </div>
    </div>
  );
}
