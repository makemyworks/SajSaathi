/**
 * Central brand configuration. Change the name, colours, contact details and links here.
 * Logo files live in /public/brand (regenerate them with brand/scripts/build_brand.py).
 */
const customerBaseUrl = process.env.NEXT_PUBLIC_CUSTOMER_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const BRAND = {
  name: "Saj Saathi",
  slug: "saj-saathi",
  tagline: "Your everyday care companion",
  supporting: "Discover. Compare. Book. Experience.",
  colors: { teal: "#183F3A", tealDeep: "#102B28", ivory: "#F7F5EF", gold: "#B98A45", goldLight: "#D9B77C", charcoal: "#202725" },
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "",
  grievanceOfficer: process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER || "",
  social: {
    instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || "",
    facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || "",
    youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE || "",
    linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || "",
  },
  urls: {
    customer: customerBaseUrl,
    partner: process.env.NEXT_PUBLIC_PARTNER_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3001" : ""),
    admin: process.env.NEXT_PUBLIC_ADMIN_URL || `${customerBaseUrl}/admin`,
  },
  logo: { full: "/brand/logo.svg", onDark: "/brand/logo-on-dark-transparent.svg", symbol: "/brand/logo-symbol.svg", tile: "/brand/logo-symbol-tile.svg" },
} as const;
