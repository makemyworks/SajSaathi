"use client";
import { LogOut } from "lucide-react";
export function LogoutButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn btn-sm btn-outline" onClick={async () => { await fetch("/api/v1/auth/logout", { method: "POST" }); window.location.href = "/"; }}>
      <LogOut aria-hidden size={18} /> {label}
    </button>
  );
}
