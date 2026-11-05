import { test } from "node:test";
import assert from "node:assert/strict";
import { allowed } from "../lib/allow";

test("admin proxy only forwards admin API paths", () => {
  for (const p of ["admin/dashboard", "admin/resources/customers", "admin/applications/0123456789abcdef01234567/decision", "bookings/0123456789abcdef01234567/action", "auth/me"]) assert.ok(allowed(p), p);
  for (const p of ["partner/dashboard", "payments/order", "me/delete", "auth/login", "admin/../me", "webhooks/razorpay", "me/addresses"]) assert.equal(allowed(p), false, p);
});
