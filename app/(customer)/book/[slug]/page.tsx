import type { Metadata } from "next";
import { loadProvider } from "@/lib/provider-page";
import { currentUser, dict } from "@/lib/session";
import { getCtx, payments } from "@/lib/server/ctx";
import type { SavedAddress } from "@/lib/core/types";
import { BookingFlow } from "@/components/BookingFlow";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Book", robots: { index: false } };
type P = Promise<{ slug: string }>;

export default async function BookPage({ params, searchParams }: { params: P; searchParams: Promise<{ service?: string; date?: string }> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const [p, t, user, ctx] = await Promise.all([loadProvider(slug), dict(), currentUser(), getCtx()]);
  const addresses = user ? await ctx.repo.col<SavedAddress>("addresses").find({ userId: user._id }, { sort: { isDefault: -1 } }) : [];
  const flag = await ctx.repo.col<{ _id: string; key: string; enabled: boolean }>("feature_flags").findOne({ key: "online_payments" });
  return (
    <div className="wrap py-8 grid gap-6 max-w-3xl">
      <Breadcrumbs items={[{ href: "/", label: "Saj Saathi" }, { href: `/p/${p.slug}`, label: p.name }, { href: `/book/${p.slug}`, label: t.booking.title }]} />
      <h1>{t.booking.title}</h1>
      <BookingFlow
        provider={p}
        initialServiceId={sp.service}
        initialDate={sp.date}
        user={user ? { name: user.name, phone: user.phone } : null}
        addresses={addresses.map((a) => ({ id: a._id, label: a.label, line1: a.line1, line2: a.line2, locality: a.locality, landmark: a.landmark, city: a.city, state: a.state, pin: a.pin }))}
        onlinePayments={!!payments && flag?.enabled !== false}
      />
    </div>
  );
}
