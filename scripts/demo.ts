import type { Ctx } from "../lib/core/context";
import type { Category, Provider, Service, User } from "../lib/core/types";
import { hashPassword } from "../lib/core/security";
import { DEFAULT_HOURS } from "../lib/core/partner";
import { newId } from "../lib/core/util";

/** Development-only sample data. Every name starts with "DEMO" so it can never be mistaken for a real partner. */
export async function createDemo(ctx: Ctx) {
  const now = ctx.now();
  const cat = await ctx.repo.col<Category>("categories").findOne({ slug: "salon-beauty" });
  if (!cat) throw new Error("Run setup without --demo first");
  if (await ctx.repo.col<Provider>("providers").findOne({ slug: "demo-salon" })) return { skipped: "already present" };
  const owner: User = { _id: newId(), role: "partner_owner", name: "DEMO Owner", email: "demo-partner@example.com", passwordHash: await hashPassword("DemoPartner2026"), status: "active", locale: "en", consents: [], createdAt: now, updatedAt: now };
  const p: Provider = {
    _id: newId(), ownerUserId: owner._id, kind: "business", categoryIds: [cat._id], primaryCategoryId: cat._id, businessName: "DEMO Salon (test data)", slug: "demo-salon",
    about: "This is sample data for testing. It is not a real business.", phone: "+919000000000",
    address: { line1: "1 Test Street", locality: "Demo Nagar", city: "Demo City", state: "Delhi", pin: "110001", country: "IN" }, branches: [],
    serviceArea: { pins: ["110001"] }, atHome: true, inStore: true, travelFeePaise: 5000, hours: DEFAULT_HOURS, holidays: [], timezone: "Asia/Kolkata",
    status: "approved", verified: true, verifiedAt: now, onboardingAnswers: {}, credentials: [], gallery: [], ratingAvg: 0, ratingCount: 0, createdAt: now, updatedAt: now,
  };
  owner.providerId = p._id;
  const svc: Service = { _id: newId(), providerId: p._id, categoryId: cat._id, name: "DEMO Haircut", durationMin: 30, pricePaise: 30000, mode: "both", addOns: [{ id: "wash", name: "Hair wash", pricePaise: 10000, durationMin: 15 }], staffIds: [], active: true, createdAt: now, updatedAt: now };
  await ctx.repo.col<User>("users").insertOne(owner);
  await ctx.repo.col<Provider>("providers").insertOne(p);
  await ctx.repo.col<Service>("services").insertOne(svc);
  return { partnerLogin: "demo-partner@example.com / DemoPartner2026", provider: "/p/demo-salon" };
}
