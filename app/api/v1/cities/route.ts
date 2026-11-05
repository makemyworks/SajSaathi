import { citiesWithProviders } from "@/lib/core/catalog";
import { api } from "@/lib/server/http";
export const GET = api(async ({ ctx }) => ({ cities: await citiesWithProviders(ctx) }));
