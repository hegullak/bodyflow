import { ProfileForm } from "@/components/forms/profile-form";
import { WithingsCard } from "@/components/integrations/withings-card";
import { Card } from "@/components/ui/card";
import { getProfileForUser } from "@/lib/actions/profile";
import { requireUserId } from "@/lib/auth/current-user";
import { getWithingsConnection } from "@/lib/withings/sync";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ withings?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const [profile, withingsConnection] = await Promise.all([
    getProfileForUser(userId),
    getWithingsConnection(userId),
  ]);

  return (
    <div>
      <h1 className="page-title">Profile</h1>
      <p className="page-subtitle">
        Used for BMI, BMR, and TDEE calculations. Your data stays private.
      </p>

      <Card>
        <ProfileForm profile={profile} />
      </Card>

      <WithingsCard connection={withingsConnection} status={params.withings} />
    </div>
  );
}
