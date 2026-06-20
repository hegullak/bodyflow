import { calcRecoveryScore, recoveryColorHex } from "@/lib/calculations/recovery";
import { RecoveryBattery } from "@/components/ui/recovery-battery";
import { getLang } from "@/lib/i18n/server";
import type { DashboardData } from "@/lib/queries/dashboard";

export async function RecoveryCard({ data }: { data: DashboardData }) {
  const lang = await getLang();

  const score = calcRecoveryScore({
    strengthSessionsThisWeek: data.weekSessionsCount,
    completedCardioSlugs: data.weekCompletedCardioSlugs,
    weekAvgCalories: data.weekAvgCalories,
    dailyCalorieTarget: data.dailyCalorieTarget,
  });

  const MAX_SUSTAINABLE_LOAD = 6.0;
  const strengthLoad = data.weekSessionsCount * 1.3;
  const cardioLoad   = data.weekCompletedCardioSlugs.reduce((s, slug) => {
    const w: Record<string, number> = { longrun: 2.0, "4x4-interval": 1.5, "tempo-run": 1.2, interval: 1.0 };
    return s + (w[slug] ?? 1.0);
  }, 0);
  const totalLoad = strengthLoad + cardioLoad;
  const trainingHigh = totalLoad / MAX_SUSTAINABLE_LOAD > 0.6;
  const caloriesLow  =
    data.weekAvgCalories != null &&
    data.dailyCalorieTarget != null &&
    data.weekAvgCalories < data.dailyCalorieTarget + totalLoad * 200 * 0.85;

  return (
    <RecoveryBattery
      score={score}
      trainingHigh={trainingHigh}
      caloriesLow={caloriesLow}
      lang={lang}
    />
  );
}
