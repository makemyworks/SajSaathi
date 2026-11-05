import { searchProviders } from "@/lib/core/catalog";
import { api, query } from "@/lib/server/http";

export const GET = api(async ({ req, ctx }) => {
  const q = query(req);
  const mode = q.get("mode");
  const sort = q.get("sort");
  return searchProviders(ctx, {
    q: q.get("q")?.slice(0, 80), category: q.get("category"), city: q.get("city")?.slice(0, 60), locality: q.get("locality")?.slice(0, 60), pin: q.get("pin"),
    mode: mode === "at_home" || mode === "in_store" ? mode : undefined,
    minRating: q.num("rating"), maxPricePaise: q.num("maxPrice") ? q.num("maxPrice")! * 100 : undefined,
    sort: sort === "rating" || sort === "price_low" || sort === "price_high" ? sort : "relevance",
    page: q.num("page"),
  });
});
