import { requirePageSession } from "@/lib/server/page-auth";
import { AccountSettings } from "@/components/account/settings";
import { bindings } from "@/lib/server/runtime";

export default async function SettingsPage() {
  const user = await requirePageSession();
  const row = await bindings().DB.prepare("SELECT retention_days FROM user_preferences WHERE user_id=?").bind(user.id).first<{ retention_days: number }>();
  return <AccountSettings role={user.role} displayName={user.displayName} initialRetentionDays={row?.retention_days ?? 180} />;
}
