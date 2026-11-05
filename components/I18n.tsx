"use client";
import { createContext, useContext, type ReactNode } from "react";
import { getDict, fmt, pick, type AppLocale, type Dict } from "@/lib/shared/i18n";

const Ctx = createContext<{ locale: AppLocale; t: Dict }>({ locale: "en", t: getDict("en") });
export function I18nProvider({ locale, children }: { locale: AppLocale; children: ReactNode }) {
  return <Ctx.Provider value={{ locale, t: getDict(locale) }}>{children}</Ctx.Provider>;
}
export function useI18n() { const c = useContext(Ctx); return { ...c, fmt, pick: (x: Parameters<typeof pick>[0]) => pick(x, c.locale) }; }
