import { applicationChecklist } from "@/lib/core/partner";
import type { Category, DocumentRecord, Provider, Service, User } from "@/lib/core/types";
import { notFound } from "@/lib/core/util";
import { audit } from "@/lib/core/context";
import { api } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";
export const GET = api(async ({ ctx, actor, params }) => {
  const a = await admin(ctx, actor, "applications.review");
  const p = await ctx.repo.col<Provider>("providers").findOne({ _id: params.id });
  if (!p) throw notFound("Application");
  const [owner, cats, docs, services, checklist] = await Promise.all([
    ctx.repo.col<User>("users").findOne({ _id: p.ownerUserId }),
    ctx.repo.col<Category>("categories").find({ _id: { $in: p.categoryIds } }),
    ctx.repo.col<DocumentRecord>("documents").find({ providerId: p._id }, { sort: { createdAt: -1 } }),
    ctx.repo.col<Service>("services").find({ providerId: p._id }),
    applicationChecklist(ctx, p),
  ]);
  await audit(ctx, a, "application.view", "provider", p._id);
  return { provider: p, owner: owner ? { name: owner.name, email: owner.email, phone: owner.phone, createdAt: owner.createdAt } : null, categories: cats, documents: docs.map(({ storageKey: _s, ...d }) => (void _s, d)), services, checklist };
});
