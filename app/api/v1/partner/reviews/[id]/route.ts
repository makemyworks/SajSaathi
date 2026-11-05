import { replyToReview } from "@/lib/core/community";
import { parse, v } from "@/lib/core/validate";
import { api, body, needLogin } from "@/lib/server/http";
export const POST = api(async ({ req, ctx, actor, params }) => ({ review: await replyToReview(ctx, needLogin(actor), params.id, parse(v.object({ text: v.string({ min: 2, max: 600 }) }), await body(req)).text) }));
