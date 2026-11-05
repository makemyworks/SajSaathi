import { getProviderPublic } from "@/lib/core/catalog";
import { api } from "@/lib/server/http";
export const GET = api(async ({ ctx, params }) => ({ provider: await getProviderPublic(ctx, params.slug) }));
