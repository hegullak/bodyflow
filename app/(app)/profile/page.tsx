import { ProfileForm } from "@/components/forms/profile-form";
import { WithingsCard } from "@/components/integrations/withings-card";
import { Card } from "@/components/ui/card";
import { ThemePicker } from "@/components/ui/ThemePicker";
import { LanguagePicker } from "@/components/profile/language-picker";
import { FlowPicker } from "@/components/profile/flow-picker";
import { CalorieCalculator } from "@/components/profile/calorie-calculator";
import { ReminderSettingsForm } from "@/components/reminders/reminder-settings-form";
import { getReminderForUser } from "@/lib/actions/reminders";
import { getProfileForUser, type DefaultFlow } from "@/lib/actions/profile";
import { getCurrentUserDisplayName, requireUserId } from "@/lib/auth/current-user";
import { getWithingsConnection } from "@/lib/withings/sync";
import { isWithingsConfigured } from "@/lib/withings/config";
import { getLang } from "@/lib/i18n/server";
import { getT } from "@/lib/i18n/server";
import type { Lang } from "@/lib/i18n/types";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ withings?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const [profile, weighInReminder, displayName, withingsConn, lang, t] = await Promise.all([
    getProfileForUser(userId),
    getReminderForUser(userId, "weigh_in"),
    getCurrentUserDisplayName(),
    getWithingsConnection(userId),
    getLang(),
    getT(),
  ]);

  const withingsPublic = {
    connected: Boolean(withingsConn),
    lastSyncAt: withingsConn?.lastSyncAt ?? null,
  };

  return (
    <div>
      {/* Title row with language picker on the right */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">{t.profile.title}</h1>
            <span className="inline-flex items-center rounded-full bg-[var(--accent)]/20 px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]">
              Beta
            </span>
          </div>
          {displayName ? <p className="page-subtitle">{displayName}</p> : null}
        </div>
        <LanguagePicker current={lang as Lang} />
      </div>

      <Card className="card-compact mt-3">
        <ProfileForm profile={profile} />
      </Card>

      <div className="mt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text3)]">
          Kaloribehov
        </p>
        <CalorieCalculator profile={profile} />
      </div>

      {/* Flow — start page preference */}
      <div className="mt-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text3)]">
          Startside
        </p>
        <FlowPicker current={(profile?.defaultFlow ?? "bodyflow") as DefaultFlow} />
      </div>

      {/* Theme — accordion, collapsed by default */}
      <details className="group mt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-xs font-semibold uppercase tracking-widest text-[var(--text3)] select-none">
          {t.profile.theme}
          <svg
            className="h-4 w-4 text-[var(--text3)] transition-transform group-open:rotate-180"
            fill="none" stroke="currentColor" strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="mt-1 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-3">
          <ThemePicker />
        </div>
      </details>

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
          {t.profile.weighInReminder}
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
