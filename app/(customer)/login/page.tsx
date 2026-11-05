import type { Metadata } from "next";
import { Suspense } from "react";
import { dict } from "@/lib/session";
import { AuthForm } from "@/components/AuthForm";
export const metadata: Metadata = { title: "Log in", robots: { index: false } };
export default async function LoginPage() {
  const t = await dict();
  return <div className="wrap py-10 max-w-md grid gap-6"><h1>{t.auth.loginTitle}</h1><Suspense><AuthForm mode="login" /></Suspense></div>;
}
