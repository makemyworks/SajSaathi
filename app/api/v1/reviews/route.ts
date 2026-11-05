import { createReview } from "@/lib/core/community";
import { parse, v } from "@/lib/core/validate";
import { api, body, needLogin } from "@/lib/server/http";
export const POST = api(async ({ req, ctx, actor }) => ({ review: await createReview(ctx, needLogin(actor), parse(v.object({ bookingId: v.id(), rating: v.number({ int: true, min: 1, max: 5 }), text: v.optional(v.string({ max: 1000 })) }), await body(req))) }));
