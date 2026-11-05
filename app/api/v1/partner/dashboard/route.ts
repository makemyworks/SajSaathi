import { partnerDashboard } from "@/lib/core/partner";
import { bookingSummary } from "@/lib/core/bookings";
import { api } from "@/lib/server/http";
export const GET = api(async ({ ctx, actor }) => { const d = await partnerDashboard(ctx, actor); return { ...d, today: d.today.map(bookingSummary) }; });
