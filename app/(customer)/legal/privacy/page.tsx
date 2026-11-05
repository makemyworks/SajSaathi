import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { CONTENT } from "@/lib/content";
export const metadata: Metadata = { title: CONTENT["privacy"].title };
export const revalidate = 300;
export default function Page() { return <ContentPage slug="privacy" crumbs={[{ href: "/legal/privacy", label: CONTENT["privacy"].title }]} />; }
