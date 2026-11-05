import type { SupportTicket } from "@/lib/core/types";
import { getCtx } from "@/lib/server/ctx";
import { currentActor, dict } from "@/lib/session";
import { TicketCenter } from "@/components/account/Forms";
export default async function SupportPage({ searchParams }: { searchParams: Promise<{ booking?: string }> }) {
  const [a, ctx, t, sp] = await Promise.all([currentActor(), getCtx(), dict(), searchParams]);
  const list = await ctx.repo.col<SupportTicket>("tickets").find({ userId: a!.userId }, { sort: { updatedAt: -1 }, limit: 50 });
  return <div className="grid gap-4"><h2>{t.account.support}</h2><TicketCenter tickets={JSON.parse(JSON.stringify(list))} bookingId={sp.booking && /^[a-f0-9]{24}$/.test(sp.booking) ? sp.booking : undefined} /></div>;
}
