"use client";
import { Download } from "lucide-react";
export default function Reports() {
  const today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";
  return (
    <div className="grid gap-4 max-w-2xl">
      <h1 className="text-2xl">Reports</h1>
      <p className="muted">Exports are CSV files (open in Excel or Google Sheets). Amounts are in paise (₹1 = 100). Every export is recorded in the audit log.</p>
      <form className="panel p-5 grid gap-4" action="/api/admin-proxy" method="get" target="_blank">
        <input type="hidden" name="path" value="admin/reports" />
        <label className="field"><span>Report</span><select name="kind" className="input"><option value="bookings">Bookings</option><option value="payments">Payments</option><option value="commissions">Commissions by partner</option><option value="partners">Partners</option></select></label>
        <div className="grid grid-cols-2 gap-3"><label className="field"><span>From</span><input type="date" name="from" className="input" defaultValue={monthStart} required /></label><label className="field"><span>To (exclusive)</span><input type="date" name="to" className="input" defaultValue={today} required /></label></div>
        <button className="btn btn-primary justify-self-start"><Download aria-hidden size={16} />Download CSV</button>
      </form>
    </div>
  );
}
