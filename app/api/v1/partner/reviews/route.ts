import { requirePartner } from "@/lib/core/partner";
import type { Review } from "@/lib/core/types";
import { api } from "@/lib/server/http";
export const GET = api(async ({ ctx, actor }) => ({ reviews: await ctx.repo.col<Review>("reviews").find({ providerId: requirePartner(actor).providerId, status: "published" }, { sort: { createdAt: -1 }, limit: 100 }) }));
