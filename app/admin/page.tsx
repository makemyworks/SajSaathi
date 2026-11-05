"use client";
import { Dashboard } from "@/components/Dashboard";
export default function Home() { return <div className="grid gap-4"><h1 className="text-2xl">Dashboard</h1><Dashboard days={30} /></div>; }
