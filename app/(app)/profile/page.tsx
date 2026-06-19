import { ProfileForm } from "@/components/forms/profile-form";
import { WithingsCard } from "@/components/integrations/withings-card";
import { Card } from "@/components/ui/card";
import { ThemePicker } from "@/components/ui/ThemePicker";
import { ReminderSettingsForm } from "@/components/reminders/reminder-settings-form";
import { getReminderForUser } from "@/lib/actions/reminders";
import { getProfileForUser } from "@/lib/actions/profile";
import { getCurrentUserDisplayName, requireUserId } from "@/lib/auth/current-user";
import { getWithingsConnection } from "@/lib/withings/sync";
import { isWithingsConfigured } from "@/lib/withings/config";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ withings?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const [profile, weighInReminder, displayName, withingsConn] = await Promise.all([
    getProfileForUser(userId),
    getReminderForUser(userId, "weigh_in"),
    getCurrentUserDisplayName(),
    getWithingsConnection(userId),
  ]);

  const withingsPublic = {
    connected: Boolean(withingsConn),
    lastSyncAt: withingsConn?.lastSyncAt ?? null,
  };

  return (
    <div>
      <h1 className="page-title">Profile</h1>
      {displayName ? <p className="page-subtitle">{displayName}</p> : null}

      <Card className="card-compact">
        <ProfileForm profile={profile} />
      </Card>

      <Card className="card-compact mt-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text3)]">Tema</p>
        <ThemePicker />
      </Card>

      <Card className="card-compact mt-3">
        <WithingsCard
          connection={withingsPublic}
          configured={isWithingsConfigured()}
          status={params.withings ?? null}
          embedded
        />
      </Card>

      <details className="group mt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm font-medium text-[var(--text1)] select-none">
          Weigh-in reminder
          <svg
            className="h-4 w-4 text-[var(--text3)] transition-transform group-open:rotate-180"
            fill="none" stroke="currentColor" strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="mt-1 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-3">
          <ReminderSettingsForm reminderType="weigh_in" reminder={weighInReminder} />
        </div>
      </details>
    </div>
  );
}
