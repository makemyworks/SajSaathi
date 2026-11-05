import type { Category } from "@/lib/core/types";
import { api } from "@/lib/server/http";
/** Full category definitions incl. onboarding fields and credentials, for the partner application form. */
export const GET = api(async ({ ctx }) => ({ categories: await ctx.repo.col<Category>("categories").find({ status: "active" }, { sort: { sortOrder: 1 } }) }));
