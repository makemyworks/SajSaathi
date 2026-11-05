import { api } from "@/lib/server/http";
import { admin } from "@/lib/server/admin-guard";
import { integrationStatus } from "@/lib/server/ctx";
/** Shows which integrations have credentials. Secrets themselves are never returned. */
export const GET = api(async ({ ctx, actor }) => { await admin(ctx, actor, "integrations.manage"); return { integrations: integrationStatus() }; });
