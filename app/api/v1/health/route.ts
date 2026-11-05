import { NextResponse } from "next/server";
import { getCtx, integrationStatus } from "@/lib/server/ctx";

export const dynamic = "force-dynamic";

/** Public, non-secret diagnostic endpoint for deployment setup. */
export async function GET() {
  const integrations = integrationStatus().map((item) => ({ key: item.key, active: item.active }));
  try {
    const ctx = await getCtx();
    await ctx.repo.col("settings").findOne({ _id: "platform" });
    return NextResponse.json({ ok: true, version: "v1", database: "connected", integrations });
  } catch (error) {
    // The raw error is kept in Vercel Runtime Logs, never returned to the browser.
    console.error("[Saj Saathi health] Runtime dependency check failed:", error);
    const message = error instanceof Error ? error.message : "Unknown runtime dependency error";
    const code = message.includes("AUTH_SECRET")
      ? "AUTH_SECRET_MISSING_OR_TOO_SHORT"
      : message.includes("MONGODB_URI")
        ? "MONGODB_URI_MISSING"
        : "MONGODB_CONNECTION_OR_CONFIGURATION_ERROR";
    return NextResponse.json({
      ok: false,
      version: "v1",
      database: "unavailable",
      error: code,
      integrations,
    }, { status: 503 });
  }
}
