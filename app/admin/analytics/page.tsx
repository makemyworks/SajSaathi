"use client";
import { useState } from "react";
import { Dashboard } from "@/components/Dashboard";
export default function Analytics() { const [d, setD] = useState(30); return <div className="grid gap-4"><div className="page-heading"><span className="section-kicker">Performance</span><h1 className="admin-page-title">Analytics</h1><p>Explore booking and marketplace trends over a selected period.</p></div><Dashboard days={d} onDays={setD} /></div>; }
