import Link from "next/link";
export default function NotFound() {
  return <main className="wrap py-20 grid gap-4 max-w-xl"><h1>We couldn&apos;t find that page</h1><p className="muted">The page may have moved, or the address may be incorrect.</p><Link className="btn btn-primary justify-self-start" href="/">Return to Saj Saathi</Link></main>;
}
