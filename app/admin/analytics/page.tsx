"use client";
import { useState } from "react";
import { Dashboard } from "@/components/Dashboard";
export default function Analytics() { const [d, setD] = useState(30); return <div className="grid gap-4"><h1 className="text-2xl">Analytics</h1><Dashboard days={d} onDays={setD} /></div>; }
