import type { Review } from "@/lib/core/types";
import { api, needLogin } from "@/lib/server/http";
export const GET = api(async ({ ctx, actor }) => ({ reviews: await ctx.repo.col<Review>("reviews").find({ customerId: needLogin(actor).userId }, { sort: { createdAt: -1 } }) }));
