import type { NextRequest } from "next/server";
import { handleAdminProxy } from "@/lib/admin-proxy";

export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  return handleAdminProxy(req, req.nextUrl.searchParams.get("path") ?? "");
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
