import { createPaymentOrder } from "@/lib/core/payments";
import { parse, v } from "@/lib/core/validate";
import { api, body, needLogin } from "@/lib/server/http";
export const POST = api(async ({ req, ctx, actor }) => ({ order: await createPaymentOrder(ctx, needLogin(actor), parse(v.object({ bookingId: v.id() }), await body(req)).bookingId) }));
