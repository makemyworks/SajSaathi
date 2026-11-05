import { coerceAdminPayload, getResource } from "@/lib/core/admin-resources";
import { audit } from "@/lib/core/context";
import { DuplicateKeyError } from "@/lib/core/repo";
import { AppError, newId } from "@/lib/core/util";
import { api, body, query } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";

function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function strip(doc: Record<string, unknown>, hidden: string[] = []) { const d = { ...doc }; for (const h of hidden) delete d[h]; return d; }

export const GET = api(async ({ req, ctx, actor, params }) => {
  const r = getResource(params.key);
  await admin(ctx, actor, r.view);
  const q = query(req);
  const filter: Record<string, unknown> = { ...(r.baseFilter ?? {}) };
  const s = q.get("q")?.trim().slice(0, 80);
  if (s && r.search?.length) filter.$or = r.search.map((f) => ({ [f]: { $regex: escapeRe(s), $options: "i" } }));
  for (const f of r.filters ?? []) { const val = q.get(`f_${f.key}`); if (val && f.options.includes(val)) filter[f.key] = val; }
  const limit = Math.min(100, q.num("limit") ?? 25), page = Math.max(1, q.num("page") ?? 1);
  const col = ctx.repo.col<{ _id: string }>(r.collection);
  const [rows, total] = await Promise.all([col.find(filter, { sort: r.sort ?? { _id: -1 }, limit, skip: (page - 1) * limit }), col.count(filter)]);
  return { rows: rows.map((x) => strip(x as Record<string, unknown>, r.hidden)), total, page, limit };
});

export const POST = api(async ({ req, ctx, actor, params }) => {
  const r = getResource(params.key);
  if (!r.canCreate || !r.manage) throw new AppError(405, "not_allowed", "New items can't be added here");
  const a = await admin(ctx, actor, r.manage);
  const data = coerceAdminPayload(r, await body(req, 200_000), true);
  const now = ctx.now();
  const doc = { _id: newId(), ...(r.defaults ?? {}), ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)), createdAt: now, updatedAt: now };
  try { await ctx.repo.col<{ _id: string }>(r.collection).insertOne(doc); }
  catch (e) { if (e instanceof DuplicateKeyError) throw new AppError(409, "duplicate", "An item with the same code already exists"); throw e; }
  await audit(ctx, a, `${r.key}.create`, r.collection, doc._id);
  return { row: strip(doc, r.hidden) };
});
