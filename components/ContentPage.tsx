import Link from "next/link";
import { CONTENT } from "@/lib/content";
import { getCtx } from "@/lib/server/ctx";
import { locale } from "@/lib/session";
import { BRAND } from "@/lib/shared/brand";
import { Breadcrumbs } from "./Breadcrumbs";
import { Notice } from "@/lib/shared/ui";

function fill(s: string) {
  return s
    .replace(/\{\{GRIEVANCE\}\}/g, BRAND.grievanceOfficer || "[Grievance Officer name, email and phone — set NEXT_PUBLIC_GRIEVANCE_OFFICER]")
    .replace(/\{\{COMPANY\}\}/g, process.env.NEXT_PUBLIC_COMPANY_DETAILS || "[Company legal name, CIN, registered address — set NEXT_PUBLIC_COMPANY_DETAILS]")
    .replace(/\{\{JURISDICTION\}\}/g, process.env.NEXT_PUBLIC_JURISDICTION_CITY || "[city]");
}

/** Very small, safe renderer: headings, bullets and paragraphs only (no HTML from the database). */
export function Prose({ text }: { text: string }) {
  const blocks = fill(text).split(/\n{2,}/);
  return (
    <div className="prose-legal">
      {blocks.map((b, i) => {
        if (b.startsWith("## ")) { const [h, ...rest] = b.split("\n"); return <div key={i}><h2>{h.slice(3)}</h2>{rest.length > 0 && <Prose text={rest.join("\n")} />}</div>; }
        const lines = b.split("\n");
        if (lines.every((l) => l.startsWith("- "))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>;
        return <p key={i}>{b}</p>;
      })}
    </div>
  );
}

export async function ContentPage({ slug, crumbs, children }: { slug: string; crumbs?: { href: string; label: string }[]; children?: React.ReactNode }) {
  const lang = await locale();
  let db: { _id: string; slug: string; published: boolean; title: Record<string, string>; body?: Record<string, string> } | null = null;
  try {
    const ctx = await getCtx();
    db = await ctx.repo.col<{ _id: string; slug: string; published: boolean; title: Record<string, string>; body?: Record<string, string> }>("pages").findOne({ slug, published: true });
  } catch (error) {
    // Static public copy remains available during first-time setup or a temporary DB outage.
    console.error(`[Saj Saathi] CMS content unavailable for /${slug}; using bundled copy:`, error);
  }
  const def = CONTENT[slug];
  const title = db ? db.title[lang] || db.title.en : def?.title ?? slug;
  const body = db ? db.body?.[lang] || db.body?.en || "" : def?.body ?? "";
  const path = crumbs?.[crumbs.length - 1]?.href ?? `/${slug}`;
  return (
    <div className="wrap py-8 grid gap-6 max-w-3xl">
      <Breadcrumbs items={[{ href: "/", label: "Saj Saathi" }, ...(crumbs ?? [{ href: path, label: title }])]} />
      <h1>{title}</h1>
      {!db && def?.draft && <Notice tone="warn">Draft prepared for legal review — not yet final. Last updated November 2026.</Notice>}
      {lang === "hi" && !db?.body?.hi && slug in CONTENT && <p className="muted" lang="hi">इस पृष्ठ का हिंदी संस्करण समीक्षा के बाद जोड़ा जाएगा।</p>}
      {!db && def?.intro && <p className="text-lg muted max-w-[60ch]">{def.intro}</p>}
      {body && <Prose text={body} />}
      {children}
      {slug === "contact" && <div><Link href="/account/support" className="btn btn-primary">Raise a ticket</Link></div>}
    </div>
  );
}
