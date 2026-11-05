import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { CONTENT } from "@/lib/content";
export const metadata: Metadata = { title: CONTENT["how-it-works"].title, description: CONTENT["how-it-works"].intro };
export const revalidate = 300;
export default function Page() { return <ContentPage slug="how-it-works" />; }
