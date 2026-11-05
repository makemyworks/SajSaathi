import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { CONTENT } from "@/lib/content";
export const metadata: Metadata = { title: CONTENT["contact"].title, description: CONTENT["contact"].intro };
export const revalidate = 300;
export default function Page() { return <ContentPage slug="contact" />; }
