import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { CONTENT } from "@/lib/content";
import { BRAND } from "@/lib/shared/brand";
export const metadata: Metadata = { title: CONTENT.partner.title, description: CONTENT.partner.intro };
export default function Page() {
  return <ContentPage slug="partner"><div className="flex gap-3 flex-wrap">{BRAND.urls.partner ? <><a href={`${BRAND.urls.partner}/signup`} className="btn btn-primary btn-xl">Apply as a partner</a><a href={`${BRAND.urls.partner}/login`} className="btn btn-outline btn-xl">Partner login</a></> : <p className="muted">The partner portal is being connected. Please check back soon.</p>}</div></ContentPage>;
}
