import { addTicketMessage } from "@/lib/core/community";
import { parse, v } from "@/lib/core/validate";
import { api, body, needLogin } from "@/lib/server/http";
export const POST = api(async ({ req, ctx, actor, params }) => ({ ticket: await addTicketMessage(ctx, needLogin(actor), params.id, parse(v.object({ text: v.string({ min: 1, max: 4000 }) }), await body(req)).text) }));
