import type { SavedAddress } from "@/lib/core/types";
import { api, needLogin } from "@/lib/server/http";
export const DELETE = api(async ({ ctx, actor, params }) => ({ ok: await ctx.repo.col<SavedAddress>("addresses").deleteOne({ _id: params.id, userId: needLogin(actor).userId }) }));
export const PATCH = api(async ({ ctx, actor, params }) => {
  const a = needLogin(actor);
  const col = ctx.repo.col<SavedAddress>("addresses");
  await col.updateMany({ userId: a.userId }, { $set: { isDefault: false } });
  return { address: await col.updateOne({ _id: params.id, userId: a.userId }, { $set: { isDefault: true } }) };
});
