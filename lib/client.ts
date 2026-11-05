"use client";
import { useCallback, useEffect, useState } from "react";

/** All calls go through this site's /api/admin-proxy, which adds the user's token on the server. */
export async function api<T = Record<string, unknown>>(path: string, method = "GET", body?: unknown): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const r = await fetch(`/api/admin-proxy/${path.replace(/^\//, "")}`, { method, headers: body && !isForm ? { "Content-Type": "application/json" } : undefined, body: body ? (isForm ? (body as FormData) : JSON.stringify(body)) : undefined });
  if (r.status === 401) { window.location.href = `/admin/login?next=${encodeURIComponent(location.pathname)}`; throw new Error("Please log in"); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: { message?: string } }).error?.message ?? "Something went wrong");
  return j as T;
}

/** Tiny data hook with reload; keeps the last good data when offline. */
export function useData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try { setData(await api<T>(path)); setError(""); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, [path]);
  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load, setData };
}
