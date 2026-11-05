import { previewPrice } from "@/lib/core/bookings";
import { parse, v } from "@/lib/core/validate";
import { api, body } from "@/lib/server/http";

const schema = v.object({ providerId: v.id(), serviceId: v.id(), addOnIds: v.array(v.string({ max: 40 }), { max: 20 }), mode: v.enum(["in_store", "at_home"] as const), couponCode: v.optional(v.string({ max: 30 })) });
export const POST = api(async ({ req, ctx, actor }) => ({ quote: await previewPrice(ctx, actor, parse(schema, await body(req))) }));
