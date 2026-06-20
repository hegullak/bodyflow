import { getT, getLang } from "@/lib/i18n/server";
import { Card, CardHint, CardTitle, CardValue } from "@/components/ui/card";
import type { DashboardData } from "@/lib/queries/dashboard";
import { LookingForwardCard } from "./looking-forward-card";
import { VibeCard } from "./vibe-card";

function formatNumber(value: number | null | undefined, suffix = ""): string {
  if (value == null) return "—";
  return `${value}${suffix}`;
}

function getDailyCoaching(
  data: DashboardData,
  lang: string,
): { title: string; body: string } | null {
  const { weekAvgCalories, dailyCalorieTarget, calorieBalance } = data;
  if (!dailyCalorieTarget) return null;

  const no = lang !== "en";

  if (weekAvgCalories != null) {
    const diff = weekAvgCalories - dailyCalorieTarget;
    const pct = diff / dailyCalorieTarget;

    if (pct > 0.1) {
      return {
        title: no ? "Litt høy uke" : "Slightly high week",
        body: no
          ? "Kalorisnittet ligger over målet ditt. Hold deg nær dagsmålet de neste dagene for å balansere uka."
          : "Your weekly average is above your daily goal. Stay close to your target the coming days.",
      };
    }
    if (pct < -0.1) {
      return {
        title: no ? "Under målet" : "Below target",
        body: no
          ? "Du spiser under mål denne uken. Sørg for å spise nok — det er viktig for energi og restitusjon."
          : "You're eating below your weekly goal. Make sure you're fueling your body adequately.",
      };
    }
  }

  if (calorieBalance != null && calorieBalance > 300) {
    return {
      title: no ? "En tyngre dag" : "A heavier day",
      body: no
        ? "Dagens inntak er over dagsmålet. En enkel dag i morgen holder uka godt på sporet."
        : "Today's intake is above your daily goal. A lighter day tomorrow will keep the week on track.",
    };
  }

  if (calorieBalance != null && calorieBalance >= -100 && calorieBalance <= 100) {
    return {
      title: no ? "Godt på sporet" : "On track",
      body: no
        ? "Inntaket i dag er rett på mål. Fortsett slik."
        : "Today's intake is right on target. Keep it up.",
    };
  }

  return null;
}

export async function DashboardCards({ data }: { data: DashboardData }) {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const d = t.dashboard;

  function formatBalance(value: number | null): string {
    if (value == null) return "—";
    if (value === 0) return d.onTarget;
    if (value < 0) return d.kcalDeficit(Math.abs(value));
    return d.kcalSurplus(value);
  }

  const coaching = getDailyCoaching(data, lang);

  return (
    <div className="space-y-2.5">
      {/* Daily coaching — Dagens vurdering */}
      {coaching && (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--text3)]">
            {d.dailyReviewTitle}
          </p>
          <p className="mt-1.5 text-sm font-semibold text-[var(--text1)]">{coaching.title}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-[var(--text2)]">{coaching.body}</p>
        </div>
      )}

      {/* Calories */}
      <Card>
        <CardTitle>{d.todaysCalories}</CardTitle>
        <CardValue>{formatNumber(data.todayCalories, " kcal")}</CardValue>
        <CardHint>
          {formatBalance(data.calorieBalance)}
          {data.dailyCalorieTarget != null ? ` · ${d.kcalTarget(data.dailyCalorieTarget)}` : ""}
        </CardHint>
        {data.weekAvgCalories != null && (
          <CardHint className="mt-0.5">{d.averageThisWeek(data.weekAvgCalories)}</CardHint>
        )}
      </Card>

      {/* Looking forward to — soft status card */}
      <LookingForwardCard initialValue={data.lookingForwardTo} />

      {/* Daily flow / vibe */}
      <VibeCard initialVibe={data.vibe} />

      {/* Latest measurements + weight */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <CardTitle>{d.latestMeasurements}</CardTitle>
          {data.latestWeight != null && (
            <div className="shrink-0 text-right">
              <p className="text-base font-semibold leading-tight">{data.latestWeight} kg</p>
            </div>
          )}
        </div>

        {data.latestMeasurement ? (
          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-[var(--text2)]">{d.chest}</p>
              <p className="font-medium">{formatNumber(data.latestMeasurement.chestCm, " cm")}</p>
            </div>
            <div>
              <p className="text-[var(--text2)]">{d.waist}</p>
              <p className="font-medium">{formatNumber(data.latestMeasurement.waistCm, " cm")}</p>
            </div>
            <div>
              <p className="text-[var(--text2)]">{d.hip}</p>
              <p className="font-medium">{formatNumber(data.latestMeasurement.hipCm, " cm")}</p>
            </div>
          </div>
        ) : (
          <CardHint className="mt-2">
            {data.latestWeight == null ? d.noMeasurementsOrWeight : d.noMeasurements}
          </CardHint>
        )}
      </Card>

      {/* Training this week */}
      <Card>
        <CardTitle>{d.trainingThisWeek}</CardTitle>
        <CardValue>{d.sessions(data.weekSessionsCount)}</CardValue>
      </Card>
    </div>
  );
}
