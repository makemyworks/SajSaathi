"use client";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { LOCALE_COOKIE } from "@/lib/shared/i18n";
import { useI18n } from "./I18n";

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const next = locale === "en" ? "hi" : "en";
  return (
    <button
      type="button"
      className={`btn btn-sm btn-outline ${className}`}
      lang={next}
      onClick={async () => {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        await fetch("/api/v1/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: next }) }).catch(() => undefined);
        router.refresh();
      }}
    >
      <Languages aria-hidden size={18} /> {t.lang.switchTo}
    </button>
  );
}
