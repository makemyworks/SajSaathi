import { report } from "@/lib/core/admin";
import { audit } from "@/lib/core/context";
import { badRequest } from "@/lib/core/util";
import { api, query } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";
export const GET = api(async ({ req, ctx, actor }) => {
  const a = await admin(ctx, actor, "reports.view");
  const q = query(req);
  const kind = q.get("kind");
  if (kind !== "bookings" && kind !== "commissions" && kind !== "payments" && kind !== "partners") throw badRequest("Unknown report");
  const from = new Date(q.get("from") ?? ""), to = new Date(q.get("to") ?? "");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) throw badRequest("Choose a valid date range");
  const r = await report(ctx, kind, from, to);
  await audit(ctx, a, "report.export", "report", kind, { from, to });
  return new Response("﻿" + r.csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${r.filename}"`, "Cache-Control": "no-store" } });
});
