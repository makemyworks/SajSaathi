import en, { type Dict } from "./en";
import hi from "./hi";

/** Languages switched on for users. To add one: create xx.ts with the same keys, have it reviewed, then add it here. */
export const LOCALES = { en, hi } as const;
export type AppLocale = keyof typeof LOCALES;
export const DEFAULT_LOCALE: AppLocale = "en";
/** Planned languages (shown in Admin → Languages). Not offered to users until translated and reviewed. */
export const PLANNED_LOCALES = ["bn", "mr", "gu", "pa", "ta", "te", "kn", "ml", "or", "as", "ur"] as const;
export const LOCALE_COOKIE = "ss_locale";

export function isLocale(x: unknown): x is AppLocale { return typeof x === "string" && x in LOCALES; }
export function getDict(locale: string | undefined): Dict { return LOCALES[isLocale(locale) ? locale : DEFAULT_LOCALE]; }
/** Replaces {name} placeholders. */
export function fmt(s: string, vars: Record<string, string | number>): string { return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")); }
/** Picks the right language from a { en, hi } object stored in the database. */
export function pick(t: { en: string; [k: string]: string | undefined } | undefined, locale: string): string { return t ? t[locale] || t.en : ""; }
export type { Dict };
