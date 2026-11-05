import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/shared/brand";
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/account", "/book/", "/login", "/signup"] }], sitemap: `${BRAND.urls.customer}/sitemap.xml` };
}
