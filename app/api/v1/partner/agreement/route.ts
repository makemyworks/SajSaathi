import { acceptAgreement } from "@/lib/core/partner";
import { LEGAL_VERSION } from "@/lib/core/auth";
import { api } from "@/lib/server/http";
export const POST = api(async ({ ctx, actor }) => { await acceptAgreement(ctx, actor, LEGAL_VERSION); return { ok: true }; });
