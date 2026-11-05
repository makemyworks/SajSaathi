import type { Metadata } from "next";
import { AdminShell } from "@/components/Admin";

export const metadata: Metadata = {
  title: { default: "Founder Console", template: "%s · Saj Saathi Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
