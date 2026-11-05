import { setHolidays } from "@/lib/core/partner";
import { api, body } from "@/lib/server/http";
export const PUT = api(async ({ req, ctx, actor }) => ({ holidays: await setHolidays(ctx, actor, (await body<{ dates: string[] }>(req)).dates ?? []) }));
