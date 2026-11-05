import type { Metadata, Viewport } from "next";
import { Lora, Mukta } from "next/font/google";
import "@/lib/shared/globals.css";
import { BRAND } from "@/lib/shared/brand";
import { I18nProvider } from "@/components/I18n";
import { locale } from "@/lib/session";

const lora = Lora({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-lora", display: "swap" });
const mukta = Mukta({ subsets: ["latin", "devanagari"], weight: ["400", "500", "600", "700"], variable: "--font-mukta", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.urls.customer),
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description: "Book verified salons, grooming, bridal makeup, massage & wellness, pet grooming and senior fitness trainers near you. See real prices and free times.",
  applicationName: BRAND.name,
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/favicon.svg", type: "image/svg+xml" }], apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "default" },
  openGraph: { siteName: BRAND.name, type: "website", locale: "en_IN", images: [{ url: "/brand/og-image.png", width: 1200, height: 630 }] },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { themeColor: BRAND.colors.teal, width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await locale();
  return (
    <html lang={lang === "hi" ? "hi-IN" : "en-IN"} className={`${lora.variable} ${mukta.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <I18nProvider locale={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
