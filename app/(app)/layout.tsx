import { BottomNav } from "@/components/layout/bottom-nav";
import { SettingsDropdown } from "@/components/layout/settings-dropdown";
import { ReminderSync } from "@/components/reminders/reminder-sync";
import { requireUserId } from "@/lib/auth/current-user";
import { getWithingsConnection } from "@/lib/withings/sync";
import { isWithingsConfigured } from "@/lib/withings/config";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();

  const withingsConnected =
    isWithingsConfigured() && (await getWithingsConnection(userId)) != null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <SettingsDropdown withingsConnected={withingsConnected} />
      </header>
      <main className="app-content">{children}</main>
      <ReminderSync />
      <BottomNav />
    </div>
  );
}
