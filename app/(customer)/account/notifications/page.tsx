import type { NotificationDoc } from "@/lib/core/types";
import { getCtx } from "@/lib/server/ctx";
import { currentActor, dict } from "@/lib/session";
import { NotificationList, PushOptIn } from "@/components/account/Forms";
export default async function NotificationsPage() {
  const [a, ctx, t] = await Promise.all([currentActor(), getCtx(), dict()]);
  const items = await ctx.repo.col<NotificationDoc>("notifications").find({ userId: a!.userId }, { sort: { createdAt: -1 }, limit: 50 });
  return <div className="grid gap-4"><div className="flex items-center gap-3 flex-wrap"><h2 className="mr-auto">{t.account.notifications}</h2><PushOptIn vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} /></div><NotificationList items={JSON.parse(JSON.stringify(items.map(({ channels: _c, ...n }) => (void _c, n))))} /></div>;
}
