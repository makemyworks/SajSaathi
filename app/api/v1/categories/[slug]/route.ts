import { getCategory, publicCategory } from "@/lib/core/catalog";
import { api } from "@/lib/server/http";
export const GET = api(async ({ ctx, params }) => ({ category: publicCategory(await getCategory(ctx, params.slug)) }));
