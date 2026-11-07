import { test } from "node:test";
import assert from "node:assert/strict";
import { makeCtx } from "./helpers";
import { login, register, resolveActor } from "../lib/core/auth";
import { getPartnerApplication, startApplication } from "../lib/core/partner";
import type { Category, Provider, User } from "../lib/core/types";

test("Partner application is recovered when the user providerId link is missing", async () => {
  const { ctx } = await makeCtx();
  const account = await register(ctx, {
    name: "Application Owner",
    email: "application-owner@example.in",
    phone: "9876543210",
    password: "PartnerPass2026",
    role: "partner_owner",
    acceptTerms: true,
  });
  const session = await login(ctx, { identifier: account.email!, password: "PartnerPass2026", expectRoles: ["partner_owner"] });
  const actor = await resolveActor(ctx, session.token);
  assert.ok(actor);
  const category = await ctx.repo.col<Category>("categories").findOne({ slug: "salon-beauty" });
  assert.ok(category);

  const firstApplication = await startApplication(ctx, actor!, {
    categoryId: category._id,
    kind: "business",
    businessName: "Retained Salon Application",
    phone: "9876543210",
  });

  // Simulate an old/partial account record whose provider link was lost.
  await ctx.repo.col<User>("users").updateOne({ _id: account._id }, { $unset: { providerId: "" } });
  const actorWithoutLink = await resolveActor(ctx, session.token);
  assert.ok(actorWithoutLink);
  assert.equal(actorWithoutLink!.providerId, undefined);

  const recovered = await getPartnerApplication(ctx, actorWithoutLink!);
  assert.equal(recovered.application?._id, firstApplication._id);
  assert.equal(recovered.application?.businessName, "Retained Salon Application");

  const repairedActor = await resolveActor(ctx, session.token);
  assert.equal(repairedActor?.providerId, firstApplication._id);
  const retry = await startApplication(ctx, repairedActor!, {
    categoryId: category._id,
    kind: "business",
    businessName: "A duplicate should not be created",
    phone: "9876543210",
  });
  assert.equal(retry._id, firstApplication._id);
  assert.equal(await ctx.repo.col<Provider>("providers").count({ ownerUserId: account._id }), 1);
});


test("Concurrent first-step submissions create only one Partner application", async () => {
  const { ctx } = await makeCtx();
  const account = await register(ctx, {
    name: "Concurrent Owner",
    email: "concurrent-owner@example.in",
    phone: "9876543212",
    password: "PartnerPass2026",
    role: "partner_owner",
    acceptTerms: true,
  });
  const session = await login(ctx, { identifier: account.email!, password: "PartnerPass2026", expectRoles: ["partner_owner"] });
  const actor = await resolveActor(ctx, session.token);
  assert.ok(actor);
  const category = await ctx.repo.col<Category>("categories").findOne({ slug: "salon-beauty" });
  assert.ok(category);
  const results = await Promise.allSettled([
    startApplication(ctx, actor!, { categoryId: category._id, kind: "business", businessName: "Concurrent Salon", phone: "9876543212" }),
    startApplication(ctx, actor!, { categoryId: category._id, kind: "business", businessName: "Concurrent Salon", phone: "9876543212" }),
  ]);
  const successful = results.filter((r): r is PromiseFulfilledResult<Provider> => r.status === "fulfilled");
  assert.ok(successful.length >= 1 && successful.length <= 2);
  assert.equal(await ctx.repo.col<Provider>("providers").count({ ownerUserId: account._id }), 1);
  const retry = await startApplication(ctx, actor!, { categoryId: category._id, kind: "business", businessName: "Retry should reuse", phone: "9876543212" });
  assert.equal(await ctx.repo.col<Provider>("providers").count({ ownerUserId: account._id }), 1);
  assert.equal(retry._id, successful[0].value._id);
});
