import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { CONTENT } from "@/lib/content";
export const metadata: Metadata = { title: CONTENT["refunds"].title };
export const revalidate = 300;
export default function Page() { return <ContentPage slug="refunds" crumbs={[{ href: "/legal/refunds", label: CONTENT["refunds"].title }]} />; }
