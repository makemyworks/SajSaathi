import type { SavedAddress } from "@/lib/core/types";
import { parse, v } from "@/lib/core/validate";
import { newId, PIN_RE } from "@/lib/core/util";
import { api, body, needLogin } from "@/lib/server/http";

const schema = v.object({ label: v.optional(v.string({ max: 30 })), line1: v.string({ min: 3, max: 160 }), line2: v.optional(v.string({ max: 160 })), locality: v.optional(v.string({ max: 80 })), landmark: v.optional(v.string({ max: 80 })), city: v.string({ min: 2, max: 60 }), state: v.string({ min: 2, max: 60 }), pin: v.string({ pattern: PIN_RE, msg: "PIN code must be 6 digits" }), isDefault: v.optional(v.boolean()) });
export const GET = api(async ({ ctx, actor }) => ({ addresses: await ctx.repo.col<SavedAddress>("addresses").find({ userId: needLogin(actor).userId }, { sort: { isDefault: -1, createdAt: -1 } }) }));
export const POST = api(async ({ req, ctx, actor }) => {
  const a = needLogin(actor);
  const b = parse(schema, await body(req));
  const col = ctx.repo.col<SavedAddress>("addresses");
  if ((await col.count({ userId: a.userId })) >= 10) return { error: "limit" };
  if (b.isDefault) await col.updateMany({ userId: a.userId }, { $set: { isDefault: false } });
  const doc: SavedAddress = { _id: newId(), userId: a.userId, ...b, country: "IN", createdAt: ctx.now() };
  await col.insertOne(doc);
  return { address: doc };
});
