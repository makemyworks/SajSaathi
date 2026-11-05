import { currentUser, dict } from "@/lib/session";
import { ProfileForm, PasswordForm } from "@/components/account/Forms";
export default async function ProfilePage() {
  const [u, t] = await Promise.all([currentUser(), dict()]);
  return <div className="grid gap-4"><h2>{t.account.profile}</h2><ProfileForm name={u!.name} email={u!.email} phone={u!.phone} locale={u!.locale} marketing={u!.consents.some((c) => c.kind.startsWith("marketing_") && c.granted)} /><PasswordForm /></div>;
}
