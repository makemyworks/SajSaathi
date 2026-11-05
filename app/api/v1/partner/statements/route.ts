import { commissionStatement } from "@/lib/core/partner";
import { api, query } from "@/lib/server/http";
export const GET = api(async ({ req, ctx, actor }) => commissionStatement(ctx, actor, query(req).get("month") ?? new Date(Date.now() + 330 * 60000).toISOString().slice(0, 7)));
