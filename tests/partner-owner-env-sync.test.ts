import { test } from "node:test";
import assert from "node:assert/strict";
import { makeCtx } from "./helpers";
import { login, register, resolveActor, syncPartnerOwnerFromEnv } from "../lib/core/auth";
import { startApplication } from "../lib/core/partner";
import type { Category, User } from "../lib/core/types";

test("Partner owner Vercel env changes update the same account and preserve its application link", async () => {
  const { ctx } = await makeCtx();
  const firstEnv = {
    PARTNER_OWNER_NAME: "Saj Saathi Founder Partner",
    PARTNER_OWNER_EMAIL: "first-partner@example.in",
    PARTNER_OWNER_PASSWORD: "PartnerPass2026",
  };

  const first = await syncPartnerOwnerFromEnv(ctx, firstEnv);
  assert.ok(first);
  assert.equal(first.role, "partner_owner");
  assert.equal(first.email, firstEnv.PARTNER_OWNER_EMAIL);

  const firstLogin = await login(ctx, { identifier: firstEnv.PARTNER_OWNER_EMAIL, password: firstEnv.PARTNER_OWNER_PASSWORD, expectRoles: ["partner_owner"] });
  const actor = await resolveActor(ctx, firstLogin.token);
  assert.ok(actor);
  const category = await ctx.repo.col<Category>("categories").findOne({ slug: "salon-beauty" });
  assert.ok(category);
  const application = await startApplication(ctx, actor!, { categoryId: category._id, kind: "business", businessName: "Saj Saathi Demo Studio", phone: "9876543210" });

  const secondEnv = {
    PARTNER_OWNER_NAME: "Saj Saathi Partner",
    PARTNER_OWNER_EMAIL: "new-partner@example.in",
    PARTNER_OWNER_PASSWORD: "NewPartnerPass2026",
  };
  const updated = await syncPartnerOwnerFromEnv(ctx, secondEnv);
  assert.ok(updated);
  assert.equal(updated._id, first._id);
  assert.equal(updated.providerId, application._id);
  assert.equal(updated.email, secondEnv.PARTNER_OWNER_EMAIL);

  await assert.rejects(login(ctx, { identifier: firstEnv.PARTNER_OWNER_EMAIL, password: firstEnv.PARTNER_OWNER_PASSWORD, expectRoles: ["partner_owner"] }), /Wrong email\/mobile or password/);
  const newLogin = await login(ctx, { identifier: secondEnv.PARTNER_OWNER_EMAIL, password: secondEnv.PARTNER_OWNER_PASSWORD, expectRoles: ["partner_owner"] });
  const newActor = await resolveActor(ctx, newLogin.token);
  assert.ok(newActor);
  assert.equal(newActor!.providerId, application._id);

  const unchanged = await syncPartnerOwnerFromEnv(ctx, secondEnv);
  assert.equal(unchanged?._id, first._id);
  const users = await ctx.repo.col<User>("users").find({ partnerBootstrapManaged: true });
  assert.equal(users.length, 1);
});

test("Partner env sync is optional when no Partner owner variables are set", async () => {
  const { ctx } = await makeCtx();
  assert.equal(await syncPartnerOwnerFromEnv(ctx, {}), null);
});

test("Vercel owner env can attach to an existing Partner account by its registered phone", async () => {
  const { ctx } = await makeCtx();
  const existing = await register(ctx, {
    name: "Existing Salon Owner",
    email: "old-owner@example.in",
    phone: "9876543210",
    password: "OldPartnerPass2026",
    role: "partner_owner",
    acceptTerms: true,
  });
  const oldSession = await login(ctx, { identifier: existing.email!, password: "OldPartnerPass2026", expectRoles: ["partner_owner"] });
  const oldActor = await resolveActor(ctx, oldSession.token);
  assert.ok(oldActor);
  const category = await ctx.repo.col<Category>("categories").findOne({ slug: "salon-beauty" });
  assert.ok(category);
  const application = await startApplication(ctx, oldActor!, { categoryId: category._id, kind: "business", businessName: "Existing Salon", phone: "9876543210" });

  const adopted = await syncPartnerOwnerFromEnv(ctx, {
    PARTNER_OWNER_NAME: "Existing Salon Owner",
    PARTNER_OWNER_EMAIL: "new-owner@example.in",
    PARTNER_OWNER_PASSWORD: "NewPartnerPass2026",
    PARTNER_OWNER_PHONE: "9876543210",
  });
  assert.equal(adopted?._id, existing._id);
  assert.equal(adopted?.email, "new-owner@example.in");
  assert.equal(adopted?.providerId, application._id);
  const newSession = await login(ctx, { identifier: "new-owner@example.in", password: "NewPartnerPass2026", expectRoles: ["partner_owner"] });
  const newActor = await resolveActor(ctx, newSession.token);
  assert.equal(newActor?.providerId, application._id);
});


test("Vercel first-time Partner credentials adopt the only existing Partner account without requiring the old phone", async () => {
  const { ctx } = await makeCtx();
  const existing = await register(ctx, {
    name: "Existing Owner",
    email: "old-existing-owner@example.in",
    phone: "9876543210",
    password: "OldPartnerPass2026",
    role: "partner_owner",
    acceptTerms: true,
  });
  const session = await login(ctx, { identifier: existing.email!, password: "OldPartnerPass2026", expectRoles: ["partner_owner"] });
  const actor = await resolveActor(ctx, session.token);
  assert.ok(actor);
  const category = await ctx.repo.col<Category>("categories").findOne({ slug: "salon-beauty" });
  assert.ok(category);
  const application = await startApplication(ctx, actor!, { categoryId: category._id, kind: "business", businessName: "Retention Studio", phone: "9876543210" });

  const adopted = await syncPartnerOwnerFromEnv(ctx, {
    PARTNER_OWNER_NAME: "Updated Owner",
    PARTNER_OWNER_EMAIL: "new-existing-owner@example.in",
    PARTNER_OWNER_PASSWORD: "NewPartnerPass2026",
  });
  assert.equal(adopted?._id, existing._id);
  assert.equal(adopted?.providerId, application._id);
  assert.equal(adopted?.email, "new-existing-owner@example.in");
  const providers = await ctx.repo.col<Provider>("providers").find({ ownerUserId: existing._id });
  assert.equal(providers.length, 1);
});

test("Vercel Partner setup refuses to guess when multiple existing Partner accounts could match", async () => {
  const { ctx } = await makeCtx();
  for (const [name, email, phone] of [
    ["Owner One", "owner-one@example.in", "9876543210"],
    ["Owner Two", "owner-two@example.in", "9876543211"],
  ]) {
    await register(ctx, { name, email, phone, password: "PartnerPass2026", role: "partner_owner", acceptTerms: true });
  }
  await assert.rejects(
    syncPartnerOwnerFromEnv(ctx, { PARTNER_OWNER_EMAIL: "new-owner@example.in", PARTNER_OWNER_PASSWORD: "NewPartnerPass2026" }),
    /More than one Partner account exists/,
  );
  assert.equal(await ctx.repo.col<User>("users").count({ role: "partner_owner" }), 2);
  assert.equal(await ctx.repo.col<User>("users").count({ partnerBootstrapManaged: true }), 0);
});
