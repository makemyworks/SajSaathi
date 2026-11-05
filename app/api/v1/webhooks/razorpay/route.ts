import { NextResponse, type NextRequest } from "next/server";
import { handleRazorpayWebhook } from "@/lib/core/payments";
import { AppError } from "@/lib/core/util";
import { getCtx } from "@/lib/server/ctx";

/** Configure in Razorpay Dashboard → Webhooks: URL https://<api-domain>/api/v1/webhooks/razorpay,
 *  events payment.captured, payment.failed, payment.authorized, refund.processed, refund.failed. */
export async function POST(req: NextRequest) {
  const raw = await req.text(); // raw body is required for signature verification
  try {
    const r = await handleRazorpayWebhook(await getCtx(), raw, req.headers.get("x-razorpay-signature"), req.headers.get("x-razorpay-event-id"));
    return NextResponse.json(r);
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.code }, { status: e.status });
    console.error("[webhook]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 }); // Razorpay retries on 5xx
  }
}
