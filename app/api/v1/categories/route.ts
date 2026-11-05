import { listCategories } from "@/lib/core/catalog";
import { api } from "@/lib/server/http";
export const GET = api(async ({ ctx }) => ({ categories: await listCategories(ctx) }));
