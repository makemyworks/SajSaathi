import { getBooking } from "@/lib/core/bookings";
import type { Provider, Payment, Category } from "@/lib/core/types";
import { api, needLogin } from "@/lib/server/http";

export const GET = api(async ({ ctx, actor, params }) => {
  const a = needLogin(actor);
  const b = await getBooking(ctx, a, params.id);
  const [p, payments, cat] = await Promise.all([
    ctx.repo.col<Provider>("providers").findOne({ _id: b.providerId }),
    ctx.repo.col<Payment>("payments").find({ bookingId: b._id }, { sort: { createdAt: -1 } }),
    ctx.repo.col<Category>("categories").findOne({ _id: b.categoryId }),
  ]);
  // Private booking fields (health notes, emergency contact) are visible only to the customer, the provider and admins — all of whom pass getBooking.
  return {
    booking: b,
    provider: p ? { id: p._id, slug: p.slug, name: p.businessName, phone: a.role === "customer" && ["confirmed", "rescheduled", "in_progress"].includes(b.status) ? p.phone : undefined, address: b.mode === "in_store" ? p.address : undefined } : null,
    category: cat ? { id: cat._id, name: cat.name, cancellationPolicy: cat.cancellationPolicy, bookingFields: cat.bookingFields, safetyNotice: cat.safetyNotice } : null,
    payments: payments.map((x) => ({ id: x._id, status: x.status, amountPaise: x.amountPaise, refundedPaise: x.refundedPaise, receiptNo: x.receiptNo, method: x.method, createdAt: x.createdAt })),
  };
});
