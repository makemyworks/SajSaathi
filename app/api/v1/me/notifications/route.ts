import type { NotificationDoc } from "@/lib/core/types";
import { api, body, needLogin } from "@/lib/server/http";

export const GET = api(async ({ ctx, actor }) => {
  const a = needLogin(actor);
  const col = ctx.repo.col<NotificationDoc>("notifications");
  const [items, unread] = await Promise.all([col.find({ userId: a.userId }, { sort: { createdAt: -1 }, limit: 50 }), col.count({ userId: a.userId, read: false })]);
  return { notifications: items.map(({ channels: _c, ...n }) => (void _c, n)), unread };
});
export const PATCH = api(async ({ req, ctx, actor }) => {
  const a = needLogin(actor);
  const b = await body<{ ids?: string[]; all?: boolean }>(req);
  const filter = b.all ? { userId: a.userId, read: false } : { userId: a.userId, _id: { $in: (b.ids ?? []).slice(0, 100) } };
  return { updated: await ctx.repo.col<NotificationDoc>("notifications").updateMany(filter, { $set: { read: true } }) };
});
