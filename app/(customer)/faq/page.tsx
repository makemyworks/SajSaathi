import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { getCtx } from "@/lib/server/ctx";
import { locale } from "@/lib/session";
export const metadata: Metadata = { title: "FAQs" };
export const revalidate = 300;
type Faq = { _id: string; question: Record<string, string>; answer: Record<string, string> };
export default async function Page() {
  const [ctx, lang] = await Promise.all([getCtx(), locale()]);
  const faqs = await ctx.repo.col<Faq>("faqs").find({ audience: "customer" }, { sort: { order: 1 } });
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question.en, acceptedAnswer: { "@type": "Answer", text: f.answer.en } })) };
  return (
    <ContentPage slug="faq">
      {faqs.length === 0 ? <p className="muted">See the <a className="underline" href="/help">Help centre</a> for answers to common questions.</p> : (
        <div className="grid gap-2">{faqs.map((f) => <details key={f._id} className="panel p-4"><summary className="font-semibold cursor-pointer">{f.question[lang] || f.question.en}</summary><p className="mt-2 whitespace-pre-line">{f.answer[lang] || f.answer.en}</p></details>)}</div>
      )}
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />}
    </ContentPage>
  );
}
