import { MealsView } from "@/components/meals/meals-view";
import { getProfileForUser } from "@/lib/actions/profile";
import { getMealsGroupedByType } from "@/lib/actions/meals";
import { requireUserId } from "@/lib/auth/current-user";
import { isKassalConfigured } from "@/lib/kassal/config";
import { todayIsoDate } from "@/lib/utils";

export default async function MealsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const logDate = params.date?.match(/^\d{4}-\d{2}-\d{2}$/) ? params.date : todayIsoDate();
  const [{ byMeal, totalKcal }, profile] = await Promise.all([
    getMealsGroupedByType(userId, logDate),
    getProfileForUser(userId),
  ]);
  const kassalReady = isKassalConfigured();

  return (
    <div>
      <h1 className="page-title">Måltider</h1>
      <p className="page-subtitle">
        Søk i lokal matdatabase, Matvaretabellen og Kassal. Strekkode lagres for neste gang.
      </p>

      {!kassalReady ? (
        <p className="mb-3 rounded-[var(--radius-md)] border border-[#9a5b45]/30 bg-[#f8ece6] px-3 py-2 text-xs text-[#9a5b45]">
          Legg til <code className="text-[11px]">KASSAL_API_KEY</code> i .env.local for å slå opp
          produkter.
        </p>
      ) : null}

      <MealsView
        logDate={logDate}
        byMeal={byMeal}
        totalKcal={totalKcal}
        dailyTarget={profile?.dailyCalorieTarget ?? null}
      />
    </div>
  );
}
