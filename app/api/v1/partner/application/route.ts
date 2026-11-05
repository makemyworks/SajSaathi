import { startApplication, updateApplication, applicationChecklist, requirePartner } from "@/lib/core/partner";
import type { Category, DocumentRecord, Provider } from "@/lib/core/types";
import { parse, v } from "@/lib/core/validate";
import { AppError } from "@/lib/core/util";
import { api, body, needLogin } from "@/lib/server/http";

export const GET = api(async ({ ctx, actor }) => {
  const a = needLogin(actor);
  if (!a.providerId) return { application: null };
  const p = await ctx.repo.col<Provider>("providers").findOne({ _id: a.providerId });
  if (!p) return { application: null };
  const [category, checklist, docs] = await Promise.all([
    ctx.repo.col<Category>("categories").findOne({ _id: p.primaryCategoryId }),
    applicationChecklist(ctx, p),
    ctx.repo.col<DocumentRecord>("documents").find({ providerId: p._id }, { sort: { createdAt: -1 } }),
  ]);
  return { application: p, category, checklist, documents: docs.map(({ storageKey: _s, ...d }) => (void _s, d)) };
});

const startSchema = v.object({ categoryId: v.id(), kind: v.enum(["business", "individual"] as const), businessName: v.string({ min: 2, max: 100 }), phone: v.string({ max: 20 }) });
export const POST = api(async ({ req, ctx, actor }) => {
  const a = needLogin(actor);
  if (a.role !== "partner_owner") throw new AppError(403, "forbidden", "Please use a partner account");
  return { application: await startApplication(ctx, a, parse(startSchema, await body(req))) };
});

export const PATCH = api(async ({ req, ctx, actor }) => {
  requirePartner(actor, true);
  const b = await body<Record<string, unknown>>(req, 100_000);
  const allowed = ["businessName", "about", "email", "address", "serviceArea", "atHome", "inStore", "travelFeePaise", "hours", "onboardingAnswers", "credentials", "branches"];
  const input = Object.fromEntries(Object.entries(b).filter(([k]) => allowed.includes(k)));
  return { application: await updateApplication(ctx, actor, input) };
});
