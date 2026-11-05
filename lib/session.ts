import { cookies } from "next/headers";
import { resolveActor } from "@/lib/core/auth";
import type { User } from "@/lib/core/types";
import { getCtx } from "@/lib/server/ctx";
import { SESSION_COOKIE } from "@/lib/server/http";
import { getDict, isLocale, LOCALE_COOKIE, type AppLocale } from "@/lib/shared/i18n";

/** For server components: who is looking at this page (or null). */
export async function currentActor() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const ctx = await getCtx();
  return resolveActor(ctx, token);
}
export async function currentUser(): Promise<User | null> {
  const a = await currentActor();
  if (!a) return null;
  const ctx = await getCtx();
  return ctx.repo.col<User>("users").findOne({ _id: a.userId });
}
export async function locale(): Promise<AppLocale> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(c) ? c : "en";
}
export async function dict() { return getDict(await locale()); }
