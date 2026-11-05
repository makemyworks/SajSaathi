import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BRAND } from "@/lib/shared/brand";

/** Visible breadcrumbs plus BreadcrumbList structured data. */
export function Breadcrumbs({ items }: { items: { href: string; label: string }[] }) {
  const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.label, item: `${BRAND.urls.customer}${x.href}` })) };
  return (
    <nav aria-label="Breadcrumb" className="text-sm muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((x, i) => (
          <li key={x.href} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronRight aria-hidden size={14} />}
            {i === items.length - 1 ? <span aria-current="page">{x.label}</span> : <Link href={x.href} className="hover:underline">{x.label}</Link>}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
    </nav>
  );
}
