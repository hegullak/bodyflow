import { and, count, desc, eq, gte, isNotNull, lte, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { bodyMeasurements, dailyBodyLogs, scheduledSessions, userProfiles, workoutSessions } from "@/db/schema";
import { scopeBy } from "@/lib/auth/scope";
import {
  calculateBmi,
  calculateCalorieBalance,
  formatBmiCategory,
  getBmiCategory,
} from "@/lib/calculations/body-metrics";

function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoMinus(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - days);
  return localIsoDate(d);
}

function calcConsecutiveDays(activeDates: Set<string>, today: string): number {
  let days = 0;
  let cursor = today;
  while (activeDates.has(cursor)) {
    days++;
    cursor = isoMinus(cursor, 1);
  }
  return days;
}

export async function getDashboardData(userId: string, referenceDate = new Date()) {
  const db = getDb();
  const today = localIsoDate(referenceDate);

  // Monday of current week (local time, no UTC shift)
  const dow = referenceDate.getDay();
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const weekStartDate = new Date(referenceDate);
  weekStartDate.setDate(weekStartDate.getDate() - daysFromMon);
  weekStartDate.setHours(0, 0, 0, 0);
  const weekStartIso = localIsoDate(weekStartDate);
  const weekDaysElapsed = daysFromMon + 1;
  const weekStart = weekStartDate;

  // 14-day window for consecutive-day computation
  const fourteenDaysAgo = isoMinus(today, 14);
  const fourteenDaysAgoDate = new Date(fourteenDaysAgo + "T00:00:00");

  // 3-day window for short-term calorie average
  const threeDaysAgo = isoMinus(today, 2);

  const [
    profile,
    todayLog,
    recentLogs,
    latestMeasurement,
    weekLogs,
    weekSessionsResult,
    weekCardioResult,
    recentStrengthDates,
    recentCardioDates,
    threeDayLogs,
  ] = await Promise.all([
    db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, userId) }),
    db.query.dailyBodyLogs.findFirst({
      where: scopeBy(dailyBodyLogs.userId, userId, eq(dailyBodyLogs.logDate, today)),
    }),
    db.query.dailyBodyLogs.findMany({
      where: scopeBy(dailyBodyLogs.userId, userId),
      orderBy: [desc(dailyBodyLogs.logDate)],
      limit: 30,
    }),
    db.query.bodyMeasurements.findFirst({
      where: scopeBy(bodyMeasurements.userId, userId),
      orderBy: [desc(bodyMeasurements.measuredOn)],
    }),
    db.query.dailyBodyLogs.findMany({
      where: and(
        scopeBy(dailyBodyLogs.userId, userId),
        gte(dailyBodyLogs.logDate, weekStartIso),
        lte(dailyBodyLogs.logDate, today),
      ),
    }),
    db.select({ count: count() })
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.userId, userId),
        gte(workoutSessions.startedAt, weekStart),
        isNotNull(workoutSessions.endedAt),
      )),
    db.select({ cardioSlug: scheduledSessions.cardioSlug })
      .from(scheduledSessions)
      .where(and(
        eq(scheduledSessions.userId, userId),
        gte(scheduledSessions.date, weekStartIso),
        lte(scheduledSessions.date, today),
        eq(scheduledSessions.isCompleted, true),
        isNotNull(scheduledSessions.cardioSlug),
      )),
    // All strength session dates in last 14 days (for consecutive-day calc)
    db.select({ startedAt: workoutSessions.startedAt })
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.userId, userId),
        gte(workoutSessions.startedAt, fourteenDaysAgoDate),
        isNotNull(workoutSessions.endedAt),
      )),
    // All completed cardio dates in last 14 days
    db.select({ date: scheduledSessions.date })
      .from(scheduledSessions)
      .where(and(
        eq(scheduledSessions.userId, userId),
        gte(scheduledSessions.date, fourteenDaysAgo),
        lte(scheduledSessions.date, today),
        eq(scheduledSessions.isCompleted, true),
        isNotNull(scheduledSessions.cardioSlug),
      )),
    // 3-day calorie average
    db.query.dailyBodyLogs.findMany({
      where: and(
        scopeBy(dailyBodyLogs.userId, userId),
        gte(dailyBodyLogs.logDate, threeDaysAgo),
        lte(dailyBodyLogs.logDate, today),
      ),
    }),
  ]);

  // ── Compute consecutive training days ────────────────────────────────────
  const activeDates = new Set<string>();
  for (const s of recentStrengthDates) {
    activeDates.add(localIsoDate(new Date(s.startedAt)));
  }
  for (const c of recentCardioDates) {
    activeDates.add(c.date);
  }
  const trainingDaysInRow = calcConsecutiveDays(activeDates, today);
  const daysSinceRestDay  = trainingDaysInRow === 0 ? 0 : trainingDaysInRow - 1;

  // ── Calorie averages ─────────────────────────────────────────────────────
  const latestWeightLog = recentLogs.find((log) => log.weightKg != null) ?? null;
  const latestWeight    = latestWeightLog?.weightKg ?? null;
  const heightCm        = profile?.heightCm ?? null;

  const bmi         = latestWeight != null && heightCm != null ? calculateBmi(latestWeight, heightCm) : null;
  const bmiCategory = bmi != null ? getBmiCategory(bmi) : null;

  const calorieBalance = calculateCalorieBalance(
    todayLog?.calorieIntake,
    profile?.dailyCalorieTarget ?? null,
  );

  const weekCaloriesEntries = weekLogs.filter((l) => l.calorieIntake != null);
  const weekAvgCalories = weekCaloriesEntries.length > 0
    ? Math.round(weekCaloriesEntries.reduce((s, l) => s + l.calorieIntake!, 0) / weekDaysElapsed)
    : null;

  const threeDayEntries = threeDayLogs.filter((l) => l.calorieIntake != null);
  const avgCalories3d = threeDayEntries.length > 0
    ? Math.round(threeDayEntries.reduce((s, l) => s + l.calorieIntake!, 0) / threeDayEntries.length)
    : null;

  const weekSessionsCount         = weekSessionsResult[0]?.count ?? 0;
  const weekCompletedCardioSlugs  = weekCardioResult
    .map((r) => r.cardioSlug)
    .filter((s): s is string => s != null);

  const measurementDate       = latestMeasurement?.measuredOn ?? null;
  const weightDate            = latestWeightLog?.logDate ?? null;
  const measurementsHeaderDate =
    measurementDate && weightDate
      ? measurementDate >= weightDate ? measurementDate : weightDate
      : (measurementDate ?? weightDate);

  return {
    profileComplete: Boolean(profile?.heightCm),
    todayCalories: todayLog?.calorieIntake ?? null,
    calorieBalance,
    dailyCalorieTarget: profile?.dailyCalorieTarget ?? null,
    weekAvgCalories,
    avgCalories3d,
    weekSessionsCount,
    weekCompletedCardioSlugs,
    trainingDaysInRow,
    daysSinceRestDay,
    latestWeight,
    latestWeightDate: weightDate,
    bmi,
    bmiCategory: bmiCategory ? formatBmiCategory(bmiCategory) : null,
    latestMeasurement,
    measurementsHeaderDate,
    lookingForwardTo: profile?.lookingForwardTo ?? null,
    vibe: profile?.vibe ?? null,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
