import { upsertStaff } from "@/lib/core/partner";
import type { Staff } from "@/lib/core/types";
import { api, body } from "@/lib/server/http";
export const PATCH = api(async ({ req, ctx, actor, params }) => ({ staff: await upsertStaff(ctx, actor, { ...(await body<Partial<Staff>>(req)), _id: params.id }) }));
