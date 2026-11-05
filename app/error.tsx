"use client";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="wrap py-16 grid gap-4 max-w-xl"><h1>Something went wrong</h1><p className="muted">Please try again. If it keeps happening, check the Vercel Runtime Logs and share the reference with the site administrator.</p>{error.digest && <p className="muted text-sm">Reference: {error.digest}</p>}<div><button className="btn btn-primary" onClick={reset}>Try again</button></div></div>;
}
