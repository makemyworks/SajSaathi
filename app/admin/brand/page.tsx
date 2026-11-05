"use client";
import { BRAND } from "@/lib/shared/brand";

/** Brand identity lives in code so all three apps stay identical: lib/shared/brand.ts, globals.css tokens, /public/brand files. */
export default function Brand() {
  const files = ["logo.svg", "logo-symbol.svg", "logo-wordmark.svg", "logo-light-background.svg", "logo-dark-background.svg", "monochrome-logo.svg", "logo-stacked.svg", "logo.png"];
  return (
    <div className="grid gap-5 max-w-4xl">
      <h1 className="text-2xl">Brand settings</h1>
      <section className="panel p-5 grid gap-2"><h2 className="text-lg">Identity</h2><p><strong>{BRAND.name}</strong> — {BRAND.tagline}</p><p className="muted">{BRAND.supporting}</p>
        <p className="muted text-[0.95rem]">To change the name, colours, contact details or social links, edit <code>lib/shared/brand.ts</code> and <code>lib/shared/globals.css</code> once in the shared folder and redeploy the three projects (see docs/BRAND.md). Support contacts can also be set without a deploy in System settings.</p></section>
      <section className="panel p-5 grid gap-3"><h2 className="text-lg">Colours</h2><ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">{Object.entries(BRAND.colors).map(([k, v]) => <li key={k} className="flex items-center gap-3"><span className="size-10 rounded-lg border border-[var(--color-line)]" style={{ background: v }} /><span><span className="block font-medium">{k}</span><span className="font-mono text-sm">{v}</span></span></li>)}</ul></section>
      <section className="panel p-5 grid gap-3"><h2 className="text-lg">Logo files</h2><ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">{files.map((f) => <li key={f} className="grid gap-1"><a href={`/brand/${f}`} download className={`rounded-lg border border-[var(--color-line)] p-3 grid place-items-center h-24 ${f.includes("dark") ? "bg-[var(--color-teal-800)]" : "bg-white"}`}><img src={`/brand/${f}`} alt={f} className="max-h-16" /></a><span className="text-sm font-mono break-all">{f}</span></li>)}</ul></section>
    </div>
  );
}
