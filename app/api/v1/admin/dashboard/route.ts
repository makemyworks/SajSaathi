import { adminDashboard } from "@/lib/core/admin";
import { api, query } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";
export const GET = api(async ({ req, ctx, actor }) => { await admin(ctx, actor, "dashboard.view"); return adminDashboard(ctx, Math.min(365, Math.max(7, query(req).num("days") ?? 30))); });
