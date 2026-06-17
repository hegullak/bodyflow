import { CheckInForm } from "@/components/forms/check-in-form";
import { CheckInHistory } from "@/components/forms/check-in-history";
import { Card } from "@/components/ui/card";
import { getCheckInBundle } from "@/lib/actions/check-in";
import { requireUserId } from "@/lib/auth/current-user";
import { syncWithingsForUser } from "@/lib/withings/sync";
import { todayIsoDate } from "@/lib/utils";

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const today = todayIsoDate();
  const focusWeight = params.focus === "weight";

  await syncWithingsForUser(userId);

  const { today: todayCheckIn, initial, hasMore } = await getCheckInBundle(userId, today);

  return (
    <div>
      <h1 className="page-title">Check-in</h1>

      <Card className="card-compact">
        <CheckInForm
          logDate={today}
          today={todayCheckIn}
          focusWeight={focusWeight}
        />
      </Card>

      <CheckInHistory initial={initial} hasMore={hasMore} />
    </div>
  );
}
