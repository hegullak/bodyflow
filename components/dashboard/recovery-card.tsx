import { calcRecoveryBattery } from "@/lib/calculations/recovery";
import { RecoveryBattery } from "@/components/ui/recovery-battery";
import type { DashboardData } from "@/lib/queries/dashboard";

export function RecoveryCard({ data, compact = false }: { data: DashboardData; compact?: boolean }) {
  const result = calcRecoveryBattery({
    trainingSessionsLast7Days:  data.weekSessionsCount,
    completedCardioSlugs7d:     data.weekCompletedCardioSlugs,
    trainingDaysInRow:          data.trainingDaysInRow,
    daysSinceRestDay:           data.daysSinceRestDay,
    hardSessionsLast7Days:      data.weekSessionsCount,         // all strength = hard
    fullBodySessionsLast7Days:  data.weekSessionsCount,         // treat as full-body
    todayCalories:              data.todayCalories ?? undefined,
    averageCalories3d:          data.avgCalories3d ?? undefined,
    averageCalories7d:          data.weekAvgCalories ?? undefined,
    dailyCalorieTarget:         data.dailyCalorieTarget ?? undefined,
  });

  return <RecoveryBattery result={result} compact={compact} />;
}
