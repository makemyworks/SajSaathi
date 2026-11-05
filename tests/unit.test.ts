import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { hashPassword, verifyPassword, signToken, verifyToken, totp, verifyTotp, base32Encode, base32Decode, verifyRazorpayPaymentSignature, verifyRazorpayWebhookSignature } from "../lib/core/security";
import { matches, applyUpdate, MemoryRepo, DuplicateKeyError } from "../lib/core/repo";
import { normalizeIndianPhone, zonedToUtc, zonedParts, formatINR, PIN_RE } from "../lib/core/util";
import { canTransition } from "../lib/core/permissions";
import { evaluateCoupon, cancellationFee } from "../lib/core/pricing";
import { lockUnits } from "../lib/core/availability";
import { toCsv } from "../lib/core/admin";
import { v, parse } from "../lib/core/validate";
import { TEST_SECRET } from "./helpers";

test("password hashing verifies the right password only", async () => {
  const h = await hashPassword("Saathi2026x");
  assert.ok(h.startsWith("scrypt$"));
  assert.equal(await verifyPassword("Saathi2026x", h), true);
  assert.equal(await verifyPassword("saathi2026x", h), false);
  assert.notEqual(await hashPassword("Saathi2026x"), h, "salted");
});

test("signed tokens reject tampering and expiry", () => {
  const t = signToken({ sub: "u1", role: "customer" }, TEST_SECRET, 60);
  assert.equal(verifyToken<{ sub: string }>(t, TEST_SECRET)?.sub, "u1");
  const [h, b, s] = t.split(".");
  const forged = Buffer.from(JSON.stringify({ sub: "u1", role: "admin", exp: 9999999999 })).toString("base64url");
  assert.equal(verifyToken(`${h}.${forged}.${s}`, TEST_SECRET), null);
  assert.equal(verifyToken(t, TEST_SECRET + "x"), null);
  assert.equal(verifyToken(signToken({ sub: "u1" }, TEST_SECRET, -1), TEST_SECRET), null);
  assert.throws(() => signToken({}, "short", 60));
  void b;
});

test("TOTP matches RFC 6238 SHA1 test vectors", () => {
  const key = Buffer.from("12345678901234567890");
  const b32 = base32Encode(key);
  assert.deepEqual(base32Decode(b32), key);
  assert.equal(totp(b32, 59_000, 30, 8), "94287082");
  assert.equal(totp(b32, 1111111109_000, 30, 8), "07081804");
  assert.equal(totp(b32, 2000000000_000, 30, 8), "69279037");
  const now = 1_800_000_000_000;
  assert.equal(verifyTotp(b32, totp(b32, now), now), true);
  assert.equal(verifyTotp(b32, totp(b32, now - 30_000), now), true, "one step clock skew allowed");
  assert.equal(verifyTotp(b32, totp(b32, now - 120_000), now), false);
});

test("Razorpay signature checks (payment + webhook)", () => {
  const secret = "s3cr3t";
  const sig = createHmac("sha256", secret).update("order_1|pay_1").digest("hex");
  assert.equal(verifyRazorpayPaymentSignature("order_1", "pay_1", sig, secret), true);
  assert.equal(verifyRazorpayPaymentSignature("order_1", "pay_2", sig, secret), false);
  const body = '{"event":"payment.captured"}';
  const ws = createHmac("sha256", "wh").update(body).digest("hex");
  assert.equal(verifyRazorpayWebhookSignature(body, ws, "wh"), true);
  assert.equal(verifyRazorpayWebhookSignature(body + " ", ws, "wh"), false);
});

test("Mongo-subset matcher and updates", () => {
  const d = { a: 1, s: "Hello", tags: ["x", "y"], n: { c: new Date("2026-01-01") }, list: [{ k: 1 }, { k: 2 }] };
  assert.ok(matches(d, { a: { $in: [1, 2] }, s: { $regex: "^hel", $options: "i" } }));
  assert.ok(matches(d, { tags: "y", "n.c": { $gte: new Date("2025-12-31") } }));
  assert.ok(!matches(d, { $or: [{ a: 2 }, { s: "x" }] }));
  assert.ok(matches(d, { "list.k": 2 }));
  assert.ok(matches(d, { missing: { $exists: false } }));
  const u = applyUpdate(d, { $set: { "n.z": 5 }, $inc: { a: 2 }, $push: { tags: "z" }, $pull: { list: { k: 1 } }, $addToSet: { tags: "x" } });
  assert.equal(u.a, 3); assert.deepEqual(u.tags, ["x", "y", "z"]); assert.equal(u.list.length, 1); assert.equal((u.n as Record<string, unknown>).z, 5);
});

test("MemoryRepo enforces unique indexes atomically", async () => {
  const r = new MemoryRepo();
  const c = r.col<{ _id: string; resource: string; unit: number }>("slot_locks");
  await c.insertManyAtomic([{ _id: "1", resource: "r", unit: 1 }, { _id: "2", resource: "r", unit: 2 }]);
  await assert.rejects(c.insertManyAtomic([{ _id: "3", resource: "r", unit: 3 }, { _id: "4", resource: "r", unit: 2 }]), DuplicateKeyError);
  assert.equal(await c.count({}), 2, "partial insert rolled back");
});

test("Indian formats and time zones", () => {
  assert.equal(normalizeIndianPhone("98765 43210"), "+919876543210");
  assert.equal(normalizeIndianPhone("+91-98765-43210"), "+919876543210");
  assert.equal(normalizeIndianPhone("09876543210"), "+919876543210");
  assert.equal(normalizeIndianPhone("12345"), null);
  assert.equal(normalizeIndianPhone("5876543210"), null);
  assert.ok(PIN_RE.test("110001")); assert.ok(!PIN_RE.test("011001"));
  const u = zonedToUtc("2026-11-03", "11:00", "Asia/Kolkata");
  assert.equal(u.toISOString(), "2026-11-03T05:30:00.000Z");
  assert.deepEqual(zonedParts(u, "Asia/Kolkata").time, "11:00");
  assert.equal(zonedToUtc("2026-07-01", "09:00", "America/New_York").toISOString(), "2026-07-01T13:00:00.000Z", "DST-aware");
  assert.match(formatINR(149900), /1,499/);
});

test("booking state machine", () => {
  assert.ok(canTransition("pending", "confirmed", "partner"));
  assert.ok(!canTransition("pending", "confirmed", "customer"), "customers cannot confirm their own booking");
  assert.ok(!canTransition("completed", "cancelled", "partner"));
  assert.ok(!canTransition("pending", "completed", "partner"), "must go through in_progress");
  assert.ok(canTransition("cancelled", "refund_pending", "system"));
});

test("coupon and cancellation-fee rules", () => {
  const now = new Date("2026-11-02T00:00:00Z");
  const c = { _id: "c", code: "WELCOME", title: "", type: "percent" as const, value: 20, maxDiscountPaise: 10000, minOrderPaise: 20000, validFrom: new Date("2026-10-01"), validTo: new Date("2026-12-01"), usedCount: 0, usageLimit: 100, perUserLimit: 1, fundedBy: "platform" as const, active: true, createdAt: now };
  assert.deepEqual(evaluateCoupon(c, { subtotalPaise: 100000, categoryId: "x", providerId: "p", now, userRedemptions: 0 }), { ok: true, discountPaise: 10000 });
  assert.equal(evaluateCoupon(c, { subtotalPaise: 10000, categoryId: "x", providerId: "p", now, userRedemptions: 0 }).ok, false);
  assert.equal(evaluateCoupon(c, { subtotalPaise: 100000, categoryId: "x", providerId: "p", now, userRedemptions: 1 }).ok, false);
  assert.equal(evaluateCoupon({ ...c, active: false }, { subtotalPaise: 100000, categoryId: "x", providerId: "p", now, userRedemptions: 0 }).ok, false);
  const policy = { freeUntilHours: 4, lateFeePercent: 25, noShowFeePercent: 0 };
  const start = new Date("2026-11-02T10:00:00Z");
  assert.equal(cancellationFee(policy, 100000, start, new Date("2026-11-02T05:00:00Z"), false), 0);
  assert.equal(cancellationFee(policy, 100000, start, new Date("2026-11-02T08:00:00Z"), false), 25000);
  assert.equal(cancellationFee(policy, 100000, start, new Date("2026-11-02T08:00:00Z"), true), 0, "provider cancellations never charge the customer");
});

test("slot lock units cover service plus buffer", () => {
  const s = new Date("2026-11-03T05:30:00Z");
  assert.equal(lockUnits(s, new Date(s.getTime() + 30 * 60000), 0).length, 6);
  assert.equal(lockUnits(s, new Date(s.getTime() + 30 * 60000), 15).length, 9);
});

test("CSV export escapes and blocks formula injection", () => {
  const csv = toCsv([{ a: '=HYPERLINK("x")', b: "x,y", c: { d: 1 } }], ["a", "b", "c.d"]);
  assert.equal(csv.split("\n")[1], `"'=HYPERLINK(""x"")","x,y",1`);
});

test("request validation", () => {
  const schema = v.object({ name: v.string({ min: 2 }), age: v.optional(v.number({ int: true, min: 0 })), kind: v.enum(["a", "b"] as const) });
  assert.deepEqual(parse(schema, { name: " Asha ", kind: "a" }), { name: "Asha", kind: "a" });
  assert.throws(() => parse(schema, { name: "A", kind: "a" }));
  assert.throws(() => parse(schema, { name: "Asha", kind: "c" }));
});
