import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { CONTENT } from "@/lib/content";
import { BRAND } from "@/lib/shared/brand";
export const metadata: Metadata = { title: CONTENT["professional"].title, description: CONTENT["professional"].intro };
export const revalidate = 300;
export default function Page() { return <ContentPage slug="professional"><div>{BRAND.urls.partner ? <a href={`${BRAND.urls.partner}/signup?kind=individual`} className="btn btn-primary btn-xl">Apply as a professional</a> : <p className="muted">The partner portal is being connected. Please check back soon.</p>}</div></ContentPage>; }
