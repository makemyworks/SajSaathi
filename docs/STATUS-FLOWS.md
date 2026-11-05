# Status flows

## Booking (`lib/core/permissions.ts → BOOKING_TRANSITIONS`)
| From | To | Who |
|---|---|---|
| pending | confirmed | partner, admin |
| pending | cancelled | customer, partner (= decline, needs a reason), admin |
| pending | pending (time changed) | customer, partner, admin |
| confirmed / rescheduled | rescheduled | customer (within free window), partner, admin |
| confirmed / rescheduled | in_progress | partner, admin ("Start service") |
| confirmed / rescheduled | cancelled | customer, partner, admin |
| confirmed / rescheduled | no_show | partner, admin — only after the start time |
| in_progress | completed | partner, admin |
| cancelled (paid online) | refund_pending | system — refund request created automatically |
| completed / no_show | refund_pending | admin |
| refund_pending | refunded | system — only when Razorpay's `refund.processed` webhook arrives |

"Customer arrived" sets `arrivedAt` without changing status. Every change is appended to `booking.history` and the audit log; updates use optimistic concurrency (`status` must still match), so two people pressing buttons at once can't corrupt a booking. Holding statuses (pending, confirmed, rescheduled, in_progress) keep the slot locks; cancelled/no-show/completed release them.

Cancellation fee: customer cancelling later than the category's free window pays `lateFeePercent` of the service value. Provider cancelling a confirmed booking late bears the same amount as `providerPenaltyPaise` on their statement (Consumer Protection (E-Commerce) Rules 2020 symmetry).

## Payment (`lib/core/payments.ts`)
`not_required` (pay at venue) — or — `unpaid → created (order made) → authorized (checkout signature verified) → captured (webhook)`; `failed` from webhook; `refund_pending → refunded / partially_refunded` from refund webhooks. The UI shows "Paid" only for `captured`.

## Partner application (`lib/core/partner.ts → reviewApplication`)
`draft → submitted` (partner, after checklist complete) → `under_review` → `approved` | `documents_required` | `rejected`; `documents_required → under_review` | `rejected`; `approved → suspended`; `suspended → approved` | `rejected`; `rejected → under_review`. Rejection, document requests and suspension require a note to the partner. Only `approved` providers are ever public.
