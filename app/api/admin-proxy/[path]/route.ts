import type { NextRequest } from "next/server";
import { handleAdminProxy } from "@/lib/admin-proxy";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string }> };

async function handle(req: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return handleAdminProxy(req, path);
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
