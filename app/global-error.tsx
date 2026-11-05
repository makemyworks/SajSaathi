"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Saj Saathi] Unhandled application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", background: "#f7f5ef", color: "#202725", fontFamily: "Arial, sans-serif" }}>
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "72px 24px", display: "grid", gap: 16 }}>
          <p style={{ color: "#183f3a", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Saj Saathi</p>
          <h1 style={{ margin: 0, fontSize: 32 }}>We could not load this page</h1>
          <p style={{ margin: 0, lineHeight: 1.6 }}>A server-side problem interrupted this request. Please try again. If it continues, share the reference below with the site administrator and check the Vercel Runtime Logs.</p>
          {error.digest && <p style={{ margin: 0, fontSize: 13, color: "#59635f" }}>Reference: {error.digest}</p>}
          <div><button onClick={reset} style={{ border: 0, borderRadius: 10, padding: "12px 18px", background: "#183f3a", color: "white", fontWeight: 700, cursor: "pointer" }}>Try again</button></div>
        </main>
      </body>
    </html>
  );
}
