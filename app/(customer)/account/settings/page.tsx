import Link from "next/link";
import { currentUser, dict, locale } from "@/lib/session";
import { dateOnly } from "@/lib/shared/format";
import { DeleteAccount } from "@/components/account/Forms";
export default async function SettingsPage() {
  const [u, t, lang] = await Promise.all([currentUser(), dict(), locale()]);
  return (
    <div className="grid gap-4"><h2>{t.account.settings}</h2>
      <section className="panel p-5 grid gap-2"><h3>Your consents</h3>
        <ul className="grid gap-1">{u!.consents.map((c, i) => <li key={i} className="flex gap-3 flex-wrap"><span className="font-medium">{c.kind.replace(/_/g, " ")}</span><span className={c.granted ? "badge badge-ok" : "badge"}>{c.granted ? "Given" : "Withdrawn"}</span><span className="muted text-sm">{dateOnly(c.at, lang)} · v{c.version}</span></li>)}</ul>
        <p className="muted text-[0.95rem]">Change marketing consent on your <Link className="underline" href="/account/profile">profile</Link>. Read our <Link className="underline" href="/legal/privacy">privacy policy</Link>.</p>
      </section>
      <DeleteAccount />
    </div>
  );
}
