import { newId } from "@/lib/core/util";
import { api, body, needLogin } from "@/lib/server/http";
type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };
export const POST = api(async ({ req, ctx, actor }) => {
  const a = needLogin(actor);
  const sub = await body<Sub>(req, 4000);
  if (!sub.endpoint?.startsWith("https://") || !sub.keys?.p256dh) return { ok: false };
  const col = ctx.repo.col<{ _id: string; userId: string; endpoint: string; subscription: Sub; createdAt: Date }>("push_subscriptions");
  await col.deleteMany({ endpoint: sub.endpoint });
  await col.insertOne({ _id: newId(), userId: a.userId, endpoint: sub.endpoint, subscription: sub, createdAt: ctx.now() });
  return { ok: true };
});
