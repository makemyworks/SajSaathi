import type { SavedAddress } from "@/lib/core/types";
import { getCtx } from "@/lib/server/ctx";
import { currentActor, dict } from "@/lib/session";
import { AddressManager } from "@/components/account/Forms";
export default async function AddressesPage() {
  const [a, ctx, t] = await Promise.all([currentActor(), getCtx(), dict()]);
  const list = await ctx.repo.col<SavedAddress>("addresses").find({ userId: a!.userId }, { sort: { isDefault: -1, createdAt: -1 } });
  return <div className="grid gap-4"><h2>{t.account.addresses}</h2><AddressManager addresses={JSON.parse(JSON.stringify(list))} /></div>;
}
