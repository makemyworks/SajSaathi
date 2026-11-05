export default function Loading() {
  return <div className="wrap py-16" role="status" aria-label="Loading"><div className="h-8 w-48 rounded bg-[var(--color-sand)] animate-pulse" /><div className="mt-6 grid gap-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-[var(--color-sand)] animate-pulse" />)}</div></div>;
}
