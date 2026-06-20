// Recovery score: 0–100, based on training load × nutritional support.
//
// Core insight: high load + low calories = depleted battery.
// The nutrition term is weighted BY load — eating extra when resting barely matters,
// but undereating during a hard week crushes recovery.

const CARDIO_WEIGHTS: Record<string, number> = {
  longrun:       2.0,
  "4x4-interval": 1.5,
  "tempo-run":   1.2,
  interval:      1.0,
};

// A typical hard-but-sustainable week: 3 full-body + one heavy run ≈ 6.0 units
const MAX_SUSTAINABLE_LOAD = 6.0;

export type RecoveryInput = {
  strengthSessionsThisWeek: number;
  completedCardioSlugs: string[];   // cardio_slug for each completed cardio session
  weekAvgCalories: number | null;
  dailyCalorieTarget: number | null;
};

export function calcRecoveryScore(input: RecoveryInput): number {
  const { strengthSessionsThisWeek, completedCardioSlugs, weekAvgCalories, dailyCalorieTarget } = input;

  const strengthLoad = strengthSessionsThisWeek * 1.3;
  const cardioLoad   = completedCardioSlugs.reduce((s, slug) => s + (CARDIO_WEIGHTS[slug] ?? 1.0), 0);
  const totalLoad    = strengthLoad + cardioLoad;

  // Training drain: 0 (no sessions) → 100 (beyond sustainable)
  const trainingDrain = Math.min(totalLoad / MAX_SUSTAINABLE_LOAD, 1.0) * 100;

  // Nutritional support: how well calories cover demand (0–100, neutral = 50)
  let nutritionSupport = 50;
  if (weekAvgCalories != null && dailyCalorieTarget != null && dailyCalorieTarget > 0) {
    // Each load-unit demands roughly 200 kcal/day extra
    const adjustedTarget = dailyCalorieTarget + totalLoad * 200;
    const ratio = Math.max(0.5, Math.min(1.3, weekAvgCalories / adjustedTarget));
    nutritionSupport = ((ratio - 0.5) / 0.8) * 100;
  }

  // Battery: start full, training drains it, nutrition (scaled by load) partly refills
  const raw = 100 - trainingDrain + (nutritionSupport - 50) * (trainingDrain / 100);
  return Math.round(Math.max(0, Math.min(100, raw)));
}

export function recoveryColorHex(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

export function recoveryLabel(score: number, lang = "no"): string {
  const no = lang !== "en";
  if (score >= 75) return no ? "Ladet"    : "Charged";
  if (score >= 50) return no ? "Bra"      : "Good";
  if (score >= 25) return no ? "Sliten"   : "Tired";
  return                  no ? "Utladet"  : "Depleted";
}

export function recoveryTip(score: number, trainingHigh: boolean, caloriesLow: boolean, lang = "no"): string {
  const no = lang !== "en";
  if (caloriesLow && trainingHigh) {
    return no
      ? "Du trener mye og spiser lite — det er kombinasjonen som tapper batteriet."
      : "High training load + low fuel — that combination drains the battery fast.";
  }
  if (caloriesLow) {
    return no
      ? "Kaloriinntaket er under det treningsmengden krever."
      : "Calorie intake is below what your training demands.";
  }
  if (trainingHigh) {
    return no
      ? "Høy treningsbelastning denne uken — husk restitusjon."
      : "High training load this week — prioritise recovery.";
  }
  if (score >= 75) {
    return no ? "God balanse mellom trening og næring." : "Good balance between training and nutrition.";
  }
  return no ? "Moderat belastning — du er på rett spor." : "Moderate load — you're on track.";
}
