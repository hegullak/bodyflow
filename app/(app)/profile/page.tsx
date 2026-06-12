import { ProfileForm } from "@/components/forms/profile-form";
import { Card } from "@/components/ui/card";
import { getProfileForUser } from "@/lib/actions/profile";
import { requireUserId } from "@/lib/auth/current-user";

export default async function ProfilePage() {
  const userId = await requireUserId();
  const profile = await getProfileForUser(userId);

  return (
    <div>
      <h1 className="page-title">Profile</h1>
      <p className="page-subtitle">
        Used for BMI, BMR, and TDEE calculations. Your data stays private.
      </p>

      <Card>
        <ProfileForm profile={profile} />
      </Card>
    </div>
  );
}
