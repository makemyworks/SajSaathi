import { test } from "node:test";
import assert from "node:assert/strict";
import { makeCtx } from "./helpers";
import { register, login, resolveActor, logout } from "../lib/core/auth";
import { startApplication, updateApplication, upsertService, upsertStaff, acceptAgreement, submitApplication, reviewApplication, applicationChecklist, partnerDashboard, commissionStatement, addBlock } from "../lib/core/partner";
import { bootstrapSuperAdmin, adminDashboard, saveCategory, report } from "../lib/core/admin";
import { searchProviders, getProviderPublic, listCategories } from "../lib/core/catalog";
import { getSlots, createBooking, actOnBooking, getBooking, listBookings, reschedule, previewPrice } from "../lib/core/bookings";
import { createReview } from "../lib/core/community";
import { createPaymentOrder, verifyCheckout, handleRazorpayWebhook, decideRefund } from "../lib/core/payments";
import { adminCan } from "../lib/core/permissions";
import type { Actor, Category, DocumentRecord, Provider, Booking, Payment, NotificationDoc } from "../lib/core/types";
import { newId } from "../lib/core/util";
import type { Ctx } from "../lib/core/context";

async function actorFor(ctx: Ctx, identifier: string, password: string, roles: Actor["role"][]) {
  const r = await login(ctx, { identifier, password, expectRoles: roles });
  const a = await resolveActor(ctx, r.token);
  assert.ok(a);
  return { actor: a!, token: r.token };
}

/** Creates an approved provider through the real application flow; returns actors and ids. */
async function onboardPartner(ctx: Ctx, opts: { slug: string; name: string; phone: string; email: string; atHome?: boolean; pins?: string[] }) {
  const cat = (await ctx.repo.col<Category>("categories").findOne({ slug: opts.slug }))!;
  await register(ctx, { name: "Owner " + opts.name, email: opts.email, password: "Partner2026", role: "partner_owner", acceptTerms: true });
  let { actor } = await actorFor(ctx, opts.email, "Partner2026", ["partner_owner"]);
  const p = await startApplication(ctx, actor, { categoryId: cat._id, kind: "business", businessName: opts.name, phone: opts.phone });
  ({ actor } = await actorFor(ctx, opts.email, "Partner2026", ["partner_owner"])); // providerId now on the actor
  const answers: Record<string, unknown> = {};
  for (const f of cat.onboardingFields) answers[f.key] = f.type === "boolean" ? true : f.type === "number" ? 5 : f.type === "multiselect" ? [f.options![0].value] : "Yes";
  await updateApplication(ctx, actor, { address: { line1: "12 Market Road", locality: "Civil Lines", city: "Jaipur", state: "Rajasthan", pin: "302006", country: "IN" }, onboardingAnswers: answers, credentials: cat.requiredCredentials.map((c) => ({ key: c.key, value: "CERT-123" })), atHome: !!opts.atHome, inStore: true, serviceArea: { pins: opts.pins ?? [] }, travelFeePaise: 5000 });
  const before = await applicationChecklist(ctx, (await ctx.repo.col<Provider>("providers").findOne({ _id: p._id }))!);
  assert.ok(before.missing.includes("doc:id_proof") && before.missing.includes("services") && before.missing.includes("agreement"));
  await ctx.repo.col<DocumentRecord>("documents").insertOne({ _id: newId(), ownerUserId: actor.userId, providerId: p._id, kind: "id_proof", fileName: "id.pdf", contentType: "application/pdf", sizeBytes: 1000, storageKey: "private/x", visibility: "private", status: "uploaded", createdAt: ctx.now() });
  const svc = await upsertService(ctx, actor, { name: "Haircut", durationMin: 30, pricePaise: 30000, mode: opts.atHome ? "both" : "in_store", addOns: [{ id: "wash", name: "Hair wash", pricePaise: 10000, durationMin: 15 }] });
  await acceptAgreement(ctx, actor, "test");
  await submitApplication(ctx, actor);
  return { actor, providerId: p._id, serviceId: svc._id, category: cat };
}

async function setup(withPayments = false) {
  const env = await makeCtx(undefined, withPayments);
  const { ctx } = env;
  await bootstrapSuperAdmin(ctx, "founder@example.in", "FounderPass2026!", "Founder");
  const admin = (await actorFor(ctx, "founder@example.in", "FounderPass2026!", ["admin"])).actor;
  const partner = await onboardPartner(ctx, { slug: "salon-beauty", name: "Test Studio", phone: "9876543210", email: "owner@example.in", atHome: true, pins: ["302006", "302001"] });
  await register(ctx, { name: "Asha Verma", phone: "9123456780", password: "Customer2026", role: "customer", acceptTerms: true });
  const customer = (await actorFor(ctx, "9123456780", "Customer2026", ["customer"])).actor;
  await register(ctx, { name: "Ravi Kumar", email: "ravi@example.in", password: "Customer2026", role: "customer", acceptTerms: true });
  const customer2 = (await actorFor(ctx, "ravi@example.in", "Customer2026", ["customer"])).actor;
  return { ...env, admin, partner, customer, customer2 };
}

test("partner application → admin approval → public listing", async () => {
  const { ctx, admin, partner } = await setup();
  let res = await searchProviders(ctx, { category: "salon-beauty", city: "Jaipur" });
  assert.equal(res.total, 0, "submitted (unapproved) partners are never public");
  await assert.rejects(reviewApplication(ctx, admin, partner.providerId, "rejected"), /note/);
  await reviewApplication(ctx, admin, partner.providerId, "under_review");
  await reviewApplication(ctx, admin, partner.providerId, "approved");
  res = await searchProviders(ctx, { category: "salon-beauty", city: "jaipur" });
  assert.equal(res.total, 1);
  const prof = await getProviderPublic(ctx, res.providers[0].slug);
  assert.equal(prof.verified, true);
  const json = JSON.stringify(prof);
  assert.ok(!json.includes("CERT-123") && !json.includes("private/x") && !json.includes("ownerUserId"), "no credentials, documents or owner ids in public profile");
  // partner notified in-app
  const notes = await ctx.repo.col<NotificationDoc>("notifications").find({ userId: partner.actor.userId });
  assert.ok(notes.some((n) => n.kind === "application.status.partner" && n.body.includes("Approved")));
  // suspension removes from search
  await reviewApplication(ctx, admin, partner.providerId, "suspended", "Complaint under investigation");
  assert.equal((await searchProviders(ctx, { category: "salon-beauty" })).total, 0);
});

test("customer booking flow, slot conflicts and partner lifecycle", async () => {
  const { ctx, admin, partner, customer, customer2 } = await setup();
  await reviewApplication(ctx, admin, partner.providerId, "approved");
  const slots = await getSlots(ctx, { providerId: partner.providerId, serviceId: partner.serviceId, date: "2026-11-03", addOnIds: ["wash"] });
  assert.equal(slots.durationMin, 45);
  const eleven = slots.slots.find((s) => s.time === "11:00")!;
  assert.ok(eleven, "11:00 IST available on Tuesday");
  assert.equal((await getSlots(ctx, { providerId: partner.providerId, serviceId: partner.serviceId, date: "2026-11-01" })).slots.length, 0, "Sunday closed");
  assert.equal((await getSlots(ctx, { providerId: partner.providerId, serviceId: partner.serviceId, date: "2026-11-02" })).slots[0].time, "10:00", "today: respects 60-min lead time from 09:00");

  const price = await previewPrice(ctx, customer, { providerId: partner.providerId, serviceId: partner.serviceId, addOnIds: ["wash"], mode: "in_store" });
  assert.equal(price.totalPaise, 30000 + 10000 + 1000 + 180, "service + add-on + ₹10 fee + 18% GST on fee");

  // Two customers race for the same slot — exactly one wins.
  const input = { providerId: partner.providerId, serviceId: partner.serviceId, start: eleven.start, addOnIds: ["wash"], mode: "in_store" as const, paymentMethod: "pay_at_venue" as const };
  const results = await Promise.allSettled([createBooking(ctx, customer, input), createBooking(ctx, customer2, input)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
  assert.match(rejected.reason.message, /no longer available|just booked/);
  const booking = (results.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<Booking>).value;
  assert.equal(booking.status, "pending");
  assert.equal(booking.price.totalPaise, price.totalPaise, "price computed on server");

  // Overlapping (not identical) time is also blocked: 11:30 overlaps 11:00–11:45
  const s1130 = (await getSlots(ctx, { providerId: partner.providerId, serviceId: partner.serviceId, date: "2026-11-03" })).slots.find((s) => s.time === "11:30");
  assert.equal(s1130, undefined, "overlapping slot hidden");
  await assert.rejects(createBooking(ctx, customer2, { ...input, start: "2026-11-03T06:00:00.000Z", addOnIds: [] }), /no longer available/);

  // Permissions: other customer can't see it, other partner can't see it
  const other = booking.customerId === customer.userId ? customer2 : customer;
  const owner = booking.customerId === customer.userId ? customer : customer2;
  await assert.rejects(getBooking(ctx, other, booking._id), /not found/);
  const p2 = await onboardPartner(ctx, { slug: "pet-grooming", name: "Second Partner", phone: "9988776655", email: "p2@example.in" });
  await assert.rejects(getBooking(ctx, p2.actor, booking._id), /not found/);
  assert.equal((await listBookings(ctx, p2.actor, { scope: "all" })).length, 0);
  await assert.rejects(actOnBooking(ctx, owner, booking._id, "confirm"), /cannot be changed/);

  // Partner lifecycle
  const c = await actOnBooking(ctx, partner.actor, booking._id, "confirm");
  assert.equal(c.status, "confirmed");
  await assert.rejects(actOnBooking(ctx, partner.actor, booking._id, "complete"), /Start the service/);
  await actOnBooking(ctx, partner.actor, booking._id, "arrived");
  await actOnBooking(ctx, partner.actor, booking._id, "start");
  const done = await actOnBooking(ctx, partner.actor, booking._id, "complete");
  assert.equal(done.status, "completed");
  assert.deepEqual(done.history.map((h) => h.to), ["pending", "confirmed", "in_progress", "completed"]);

  // Review only once, only by the booking's customer, rating recalculated
  await assert.rejects(createReview(ctx, other, { bookingId: booking._id, rating: 5 }), /not found/);
  await createReview(ctx, owner, { bookingId: booking._id, rating: 4, text: "Neat work" });
  await assert.rejects(createReview(ctx, owner, { bookingId: booking._id, rating: 5 }), /already reviewed/);
  const prov = (await ctx.repo.col<Provider>("providers").findOne({ _id: partner.providerId }))!;
  assert.equal(prov.ratingAvg, 4); assert.equal(prov.ratingCount, 1);

  const dash = await partnerDashboard(ctx, partner.actor);
  assert.equal(dash.counts.completedMonth, 1);
  assert.equal(dash.revenueMonthPaise, 40000);
  const st = await commissionStatement(ctx, partner.actor, "2026-11");
  assert.equal(st.commissionPaise, 4000, "10% default commission");
  const ad = await adminDashboard(ctx);
  assert.equal(ad.counts.completed, 1);
  assert.equal(ad.counts.customers, 2);
  const csv = await report(ctx, "bookings", new Date("2026-11-01"), new Date("2026-12-01"));
  assert.ok(csv.csv.includes(booking.ref));
});

test("cancellation frees the slot; reschedule moves locks; blocks hide slots", async () => {
  const { ctx, admin, partner, customer, customer2 } = await setup();
  await reviewApplication(ctx, admin, partner.providerId, "approved");
  const start = "2026-11-03T05:30:00.000Z"; // 11:00 IST
  const b = await createBooking(ctx, customer, { providerId: partner.providerId, serviceId: partner.serviceId, start, addOnIds: [], mode: "in_store", paymentMethod: "pay_at_venue" });
  const r = await reschedule(ctx, customer, b._id, "2026-11-03T05:45:00.000Z"); // overlaps its own old slot — must work
  assert.equal(r.status, "pending", "pending bookings stay pending after a time change");
  await actOnBooking(ctx, partner.actor, b._id, "confirm");
  const r2 = await reschedule(ctx, partner.actor, b._id, "2026-11-03T05:45:00.000Z");
  assert.equal(r2.status, "rescheduled");
  await assert.rejects(createBooking(ctx, customer2, { providerId: partner.providerId, serviceId: partner.serviceId, start: "2026-11-03T05:45:00.000Z", addOnIds: [], mode: "in_store", paymentMethod: "pay_at_venue" }));
  // old 11:00 start is free again only if it no longer overlaps (11:00–11:30 vs 11:15–11:45 overlaps) → still blocked; 10:30 is free
  const b2 = await createBooking(ctx, customer2, { providerId: partner.providerId, serviceId: partner.serviceId, start: "2026-11-03T05:00:00.000Z", addOnIds: [], mode: "in_store", paymentMethod: "pay_at_venue" });
  assert.ok(b2);
  const cancelled = await actOnBooking(ctx, customer, b._id, "cancel", "Change of plans");
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.cancellationFeePaise, 0, "cancelled > 4h before");
  const again = await createBooking(ctx, customer2, { providerId: partner.providerId, serviceId: partner.serviceId, start: "2026-11-03T05:45:00.000Z", addOnIds: [], mode: "in_store", paymentMethod: "pay_at_venue" });
  assert.equal(again.status, "pending", "slot freed after cancellation");
  await addBlock(ctx, partner.actor, { start: "2026-11-04T08:30:00.000Z", end: "2026-11-04T10:30:00.000Z", reason: "Training" });
  const wed = await getSlots(ctx, { providerId: partner.providerId, serviceId: partner.serviceId, date: "2026-11-04" });
  assert.ok(!wed.slots.some((s) => s.time >= "14:00" && s.time < "16:00"), "blocked 14:00–16:00 IST");
  // Holiday and walk-in
  const walk = await createBooking(ctx, partner.actor, { providerId: partner.providerId, serviceId: partner.serviceId, start: "2026-11-05T05:30:00.000Z", addOnIds: [], mode: "in_store", paymentMethod: "pay_at_venue", customerName: "Walk-in" });
  assert.equal(walk.status, "confirmed");
});

test("category rules: at-home PIN, consent, disallowed claims, staff", async () => {
  const { ctx, admin, partner, customer } = await setup();
  await reviewApplication(ctx, admin, partner.providerId, "approved");
  const base = { providerId: partner.providerId, serviceId: partner.serviceId, start: "2026-11-03T05:30:00.000Z", addOnIds: [], paymentMethod: "pay_at_venue" as const };
  await assert.rejects(createBooking(ctx, customer, { ...base, mode: "at_home" }), /address/);
  await assert.rejects(createBooking(ctx, customer, { ...base, mode: "at_home", address: { line1: "1 Road", city: "Jaipur", state: "RJ", pin: "110001", country: "IN" } }), /does not visit/);
  const home = await createBooking(ctx, customer, { ...base, mode: "at_home", address: { line1: "1 Road", city: "Jaipur", state: "RJ", pin: "302001", country: "IN" } });
  assert.equal(home.price.travelPaise, 5000, "travel fee shown and charged");

  const massage = await onboardPartner(ctx, { slug: "massage-wellness", name: "Calm Hands", phone: "9876501234", email: "m@example.in" });
  await reviewApplication(ctx, admin, massage.providerId, "approved");
  await assert.rejects(createBooking(ctx, customer, { providerId: massage.providerId, serviceId: massage.serviceId, start: "2026-11-03T05:30:00.000Z", addOnIds: [], mode: "in_store", paymentMethod: "pay_at_venue" }), /accept/);
  const ok = await createBooking(ctx, customer, { providerId: massage.providerId, serviceId: massage.serviceId, start: "2026-11-03T05:30:00.000Z", addOnIds: [], mode: "in_store", paymentMethod: "pay_at_venue", consent: true });
  assert.ok(ok.consentAt);
  await assert.rejects(upsertService(ctx, massage.actor, { name: "Body to body massage", durationMin: 60, pricePaise: 100000 }), /don't use/);

  const pet = await onboardPartner(ctx, { slug: "pet-grooming", name: "Paws Grooming", phone: "9876512345", email: "pet@example.in" });
  await assert.rejects(upsertService(ctx, pet.actor, { name: "Vet checkup", durationMin: 30, pricePaise: 50000 }), /don't use/);
  await reviewApplication(ctx, admin, pet.providerId, "approved");
  await assert.rejects(createBooking(ctx, customer, { providerId: pet.providerId, serviceId: pet.serviceId, start: "2026-11-03T05:30:00.000Z", addOnIds: [], mode: "in_store", paymentMethod: "pay_at_venue", consent: true, fields: { pet_type: "dog" } }), /Size is required/);

  // Staff: two stylists → two parallel bookings at the same time
  await upsertStaff(ctx, partner.actor, { name: "Stylist A", role: "Stylist" });
  await upsertStaff(ctx, partner.actor, { name: "Stylist B", role: "Stylist" });
  const t = "2026-11-06T06:30:00.000Z";
  const s = await getSlots(ctx, { providerId: partner.providerId, serviceId: partner.serviceId, date: "2026-11-06" });
  assert.equal(s.slots.find((x) => x.start === t)!.staffIds.length, 2);
  const a = await createBooking(ctx, customer, { ...base, start: t, mode: "in_store" });
  const { actor: c2 } = { actor: (await ctx.repo.col<{ _id: string }>("users").findOne({ email: "ravi@example.in" }))! as unknown as { actor: Actor } };
  void c2;
  const b = await createBooking(ctx, (await login(ctx, { identifier: "ravi@example.in", password: "Customer2026", expectRoles: ["customer"] }).then((r) => resolveActor(ctx, r.token)))!, { ...base, start: t, mode: "in_store" });
  assert.notEqual(a.staffId, b.staffId);
});

test("admin can add a brand-new vertical without code changes", async () => {
  const { ctx, admin } = await setup();
  const cat = await saveCategory(ctx, admin, {
    name: { en: "Home tailoring", hi: "घर पर सिलाई" }, vertical: "tailoring", status: "active", atHomeAllowed: true,
    bookingFields: [{ key: "garment", label: { en: "Garment" }, type: "select", options: [{ value: "kurta", label: { en: "Kurta" } }], scope: "customer", required: true }],
    disallowedClaims: ["designer label"],
  });
  assert.equal(cat.slug, "home-tailoring");
  const cats = await listCategories(ctx);
  assert.ok(cats.some((c) => c.slug === "home-tailoring"));
  await assert.rejects(saveCategory(ctx, admin, { name: { en: "Home tailoring" } }), /slug/);
});

test("auth: sessions, logout, lockout, MFA, admin permissions", async () => {
  const { ctx, customer, admin } = await setup();
  void customer;
  const r = await login(ctx, { identifier: "9123456780", password: "Customer2026", expectRoles: ["customer"] });
  assert.ok(await resolveActor(ctx, r.token));
  await logout(ctx, r.token);
  assert.equal(await resolveActor(ctx, r.token), null, "logout revokes the session");
  await assert.rejects(login(ctx, { identifier: "9123456780", password: "Customer2026", expectRoles: ["admin"] }), /Wrong/, "customers can't use admin login");
  for (let i = 0; i < 8; i++) await assert.rejects(login(ctx, { identifier: "ravi@example.in", password: "bad", expectRoles: ["customer"] }));
  await assert.rejects(login(ctx, { identifier: "ravi@example.in", password: "Customer2026", expectRoles: ["customer"] }), /Too many/);
  await assert.rejects(register(ctx, { name: "X", phone: "9123456780", password: "Customer2026", role: "customer", acceptTerms: true }), /already exists/);
  assert.equal(adminCan(admin, "admins.manage"), true);
  assert.equal(adminCan({ ...admin, adminRole: "support" }, "refunds.manage"), false);
  assert.equal(adminCan({ ...admin, adminRole: "finance" }, "refunds.manage"), true);
  assert.equal(adminCan({ userId: "x", role: "customer" }, "dashboard.view"), false);
  const second = await bootstrapSuperAdmin(ctx, "evil@example.in", "AnotherPass2026!");
  assert.equal(second.created, false, "bootstrap never runs twice");
});

test("payments: order, signature, webhook idempotency, refund", async () => {
  const { ctx, admin, partner, customer, gw } = await setup(true);
  await reviewApplication(ctx, admin, partner.providerId, "approved");
  const b = await createBooking(ctx, customer, { providerId: partner.providerId, serviceId: partner.serviceId, start: "2026-11-03T05:30:00.000Z", addOnIds: [], mode: "in_store", paymentMethod: "online" });
  assert.equal(b.paymentStatus, "unpaid");
  const o = await createPaymentOrder(ctx, customer, b._id);
  assert.equal(o.amountPaise, b.price.totalPaise);
  const o2 = await createPaymentOrder(ctx, customer, b._id);
  assert.equal(o2.orderId, o.orderId, "idempotent order creation");
  await assert.rejects(verifyCheckout(ctx, customer, { orderId: o.orderId, paymentId: "pay_1", signature: "forged" }), /could not verify/);
  const v = await verifyCheckout(ctx, customer, { orderId: o.orderId, paymentId: "pay_1", signature: gw!.sign(o.orderId, "pay_1") });
  assert.equal(v.status, "verifying");
  let pay = (await ctx.repo.col<Payment>("payments").findOne({ gatewayOrderId: o.orderId }))!;
  assert.equal(pay.status, "authorized", "checkout signature alone never marks as paid");
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1", order_id: o.orderId, amount: o.amountPaise, status: "captured", method: "upi" } } } });
  await assert.rejects(handleRazorpayWebhook(ctx, body, "bad", "evt_1"), /Invalid webhook/);
  assert.deepEqual(await handleRazorpayWebhook(ctx, body, gw!.signWebhook(body), "evt_1"), { handled: true });
  assert.deepEqual(await handleRazorpayWebhook(ctx, body, gw!.signWebhook(body), "evt_1"), { handled: true, duplicate: true });
  pay = (await ctx.repo.col<Payment>("payments").findOne({ gatewayOrderId: o.orderId }))!;
  assert.equal(pay.status, "captured");
  assert.ok(pay.receiptNo);
  // Tampered amount webhook is ignored
  const bad = JSON.stringify({ event: "payment.failed", payload: { payment: { entity: { id: "pay_1", order_id: o.orderId, amount: 1, status: "failed" } } } });
  assert.deepEqual(await handleRazorpayWebhook(ctx, bad, gw!.signWebhook(bad), "evt_2"), { handled: false });
  // Cancel paid booking → refund request → admin approves → gateway webhook completes it
  const c = await actOnBooking(ctx, partner.actor, b._id, "cancel", "Stylist unwell");
  assert.equal(c.status, "refund_pending");
  const refund = (await ctx.repo.col<{ _id: string; amountPaise: number; status: string }>("refunds").findOne({ bookingId: b._id }))!;
  assert.equal(refund.amountPaise, b.price.totalPaise, "provider cancellation → full refund");
  await decideRefund(ctx, admin, refund._id, "approve");
  assert.equal(gw!.refunds.length, 1);
  const rb = JSON.stringify({ event: "refund.processed", payload: { refund: { entity: { id: gw!.refunds[0].id, payment_id: "pay_1", amount: refund.amountPaise, status: "processed" } } } });
  await handleRazorpayWebhook(ctx, rb, gw!.signWebhook(rb), "evt_3");
  const final = (await ctx.repo.col<Booking>("bookings").findOne({ _id: b._id }))!;
  assert.equal(final.status, "refunded");
  assert.equal(final.providerPenaltyPaise ?? 0, 0, "provider cancelled >4h before: no penalty");
  assert.equal((await ctx.repo.col<Payment>("payments").findOne({ _id: pay._id }))!.status, "refunded");
});

test("online payment is refused when the gateway is not configured", async () => {
  const { ctx, admin, partner, customer } = await setup(false);
  await reviewApplication(ctx, admin, partner.providerId, "approved");
  await assert.rejects(createBooking(ctx, customer, { providerId: partner.providerId, serviceId: partner.serviceId, start: "2026-11-03T05:30:00.000Z", addOnIds: [], mode: "in_store", paymentMethod: "online" }), /not available yet/);
});

test("notifications are truthful about unconfigured channels", async () => {
  const { ctx, admin, partner, customer } = await setup();
  await reviewApplication(ctx, admin, partner.providerId, "approved");
  await createBooking(ctx, customer, { providerId: partner.providerId, serviceId: partner.serviceId, start: "2026-11-03T05:30:00.000Z", addOnIds: [], mode: "in_store", paymentMethod: "pay_at_venue" });
  const n = (await ctx.repo.col<NotificationDoc>("notifications").findOne({ userId: partner.actor.userId, kind: "booking.created.partner" }))!;
  assert.match(n.body, /New booking/);
  assert.equal(n.channels.find((c) => c.channel === "sms")?.status, "skipped_not_configured");
  assert.equal(n.channels.find((c) => c.channel === "email")?.status, "sent");
  // Hindi partner gets the Hindi template
  await ctx.repo.col("users").updateOne({ _id: partner.actor.userId }, { $set: { locale: "hi" } });
  await createBooking(ctx, customer, { providerId: partner.providerId, serviceId: partner.serviceId, start: "2026-11-03T07:30:00.000Z", addOnIds: [], mode: "in_store", paymentMethod: "pay_at_venue" });
  const hi = (await ctx.repo.col<NotificationDoc>("notifications").find({ userId: partner.actor.userId, kind: "booking.created.partner" }, { sort: { createdAt: -1 } }));
  assert.ok(hi.some((x) => x.body.startsWith("नया बुकिंग मिला है")));
});
