import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { CONTENT } from "@/lib/content";
export const metadata: Metadata = { title: CONTENT["terms"].title };
export const revalidate = 300;
export default function Page() { return <ContentPage slug="terms" crumbs={[{ href: "/legal/terms", label: CONTENT["terms"].title }]} />; }
