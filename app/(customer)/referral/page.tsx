import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { getCtx } from "@/lib/server/ctx";
import { inr } from "@/lib/shared/format";
export const metadata: Metadata = { title: "Referral programme" };
export const dynamic = "force-dynamic";
type Prog = { _id: string; name: string; referrerRewardPaise?: number; refereeRewardPaise?: number; terms?: string; active: boolean };
export default async function Page() {
  let prog: Prog | null = null;
  try {
    const ctx = await getCtx();
    const flag = await ctx.repo.col<{ _id: string; key: string; enabled: boolean }>("feature_flags").findOne({ key: "referrals" });
    prog = flag?.enabled ? await ctx.repo.col<Prog>("referral_programs").findOne({ active: true }) : null;
  } catch (error) {
    console.error("[Saj Saathi] Referral programme is unavailable:", error);
  }
  if (!prog) return <ContentPage slug="referral" />;
  return <ContentPage slug="referral"><div className="panel p-5 grid gap-2"><p className="font-semibold text-lg">{prog.name}</p><p>You get {inr(prog.referrerRewardPaise)} · Your friend gets {inr(prog.refereeRewardPaise)}</p>{prog.terms && <p className="muted whitespace-pre-line">{prog.terms}</p>}<p className="muted text-sm">Referral links are issued from your account once tracking goes live.</p></div></ContentPage>;
}
