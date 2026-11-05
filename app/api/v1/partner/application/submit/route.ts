import { submitApplication } from "@/lib/core/partner";
import { api } from "@/lib/server/http";
export const POST = api(async ({ ctx, actor }) => submitApplication(ctx, actor));
