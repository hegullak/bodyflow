import { BottomNav } from "@/components/layout/bottom-nav";
import { SettingsDropdown } from "@/components/layout/settings-dropdown";
import { ReminderSync } from "@/components/reminders/reminder-sync";
import { LangProvider } from "@/components/providers/lang-provider";
import { getLang } from "@/lib/i18n/server";
import { requireUserId } from "@/lib/auth/current-user";
import { getWithingsConnection } from "@/lib/withings/sync";
import { isWithingsConfigured } from "@/lib/withings/config";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();

  const [withingsConnected, lang] = await Promise.all([
    isWithingsConfigured()
      ? getWithingsConnection(userId).then((c) => c != null)
      : Promise.resolve(false),
    getLang(),
  ]);

  return (
    <LangProvider lang={lang}>
      <div className="app-shell">
        <header className="app-header">
          <SettingsDropdown withingsConnected={withingsConnected} />
        </header>
        <main className="app-content">{children}</main>
        <ReminderSync />
        <BottomNav />
      </div>
    </LangProvider>
  );
}
