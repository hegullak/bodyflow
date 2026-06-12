import { ProfileForm } from "@/components/forms/profile-form";
import { WithingsCard } from "@/components/integrations/withings-card";
import { Card } from "@/components/ui/card";
import { ReminderSettingsForm } from "@/components/reminders/reminder-settings-form";
import { getReminderForUser } from "@/lib/actions/reminders";
import { getProfileForUser } from "@/lib/actions/profile";
import { requireUserId } from "@/lib/auth/current-user";
import { getWithingsConnection } from "@/lib/withings/sync";
import { isWithingsConfigured } from "@/lib/withings/config";
import { toWithingsConnectionPublic } from "@/lib/withings/types";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ withings?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const [profile, withingsConnection, weighInReminder] = await Promise.all([
    getProfileForUser(userId),
    getWithingsConnection(userId),
    getReminderForUser(userId, "weigh_in"),
  ]);

  return (
    <div>
      <h1 className="page-title">Profile</h1>
      <p className="page-subtitle">For BMI, BMR and TDEE. Private by default.</p>

      <Card className="card-compact">
        <ProfileForm profile={profile} />
        <hr className="section-divider" />
        <WithingsCard
          connection={toWithingsConnectionPublic(withingsConnection)}
          configured={isWithingsConfigured()}
          status={params.withings}
          embedded
        />
        <hr className="section-divider" />
        <ReminderSettingsForm reminderType="weigh_in" reminder={weighInReminder} />
      </Card>
    </div>
  );
}
