import { updateApplication } from "@/lib/core/partner";
import type { WeeklyHours } from "@/lib/core/types";
import { api, body } from "@/lib/server/http";
export const PUT = api(async ({ req, ctx, actor }) => ({ hours: (await updateApplication(ctx, actor, { hours: (await body<{ hours: WeeklyHours }>(req)).hours })).hours }));
