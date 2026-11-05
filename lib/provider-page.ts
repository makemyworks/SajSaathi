import { notFound } from "next/navigation";
import { getProviderPublic } from "@/lib/core/catalog";
import { AppError } from "@/lib/core/util";
import { getCtx } from "@/lib/server/ctx";

export async function loadProvider(slug: string) {
  try { return await getProviderPublic(await getCtx(), slug); }
  catch (e) { if (e instanceof AppError && e.status === 404) notFound(); throw e; }
}
export type PublicProvider = Awaited<ReturnType<typeof loadProvider>>;
