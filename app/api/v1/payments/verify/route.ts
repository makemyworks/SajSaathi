import { verifyCheckout } from "@/lib/core/payments";
import { parse, v } from "@/lib/core/validate";
import { api, body, needLogin } from "@/lib/server/http";
const schema = v.object({ orderId: v.string({ max: 60 }), paymentId: v.string({ max: 60 }), signature: v.string({ max: 200 }) });
export const POST = api(async ({ req, ctx, actor }) => verifyCheckout(ctx, needLogin(actor), parse(schema, await body(req))));
