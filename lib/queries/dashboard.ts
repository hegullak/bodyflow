import { and, count, desc, eq, gte, isNotNull, lte } from "drizzle-orm";
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

export async function getDashboardData(userId: string, referenceDate = new Date()) {
  const db = getDb();
  const today = localIsoDate(referenceDate);

  // Monday of current week (local time, no UTC shift)
  const dow = referenceDate.getDay(); // 0=Sun … 6=Sat
  const daysFromMon = dow === 0 ? 6 : dow - 1; // Mon=0, Tue=1, …, Sun=6
  const weekStartDate = new Date(referenceDate);
  weekStartDate.setDate(weekStartDate.getDate() - daysFromMon);
  weekStartDate.setHours(0, 0, 0, 0);
  const weekStartIso = localIsoDate(weekStartDate);

  // Days elapsed Mon→today (Mon=1 … Sun=7)
  const weekDaysElapsed = daysFromMon + 1;

  // For workout session query we still need a Date
  const weekStart = weekStartDate;

  const [profile, todayLog, recentLogs, latestMeasurement, weekLogs, weekSessionsResult, weekCardioResult] =
    await Promise.all([
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
      db
        .select({ count: count() })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, userId),
            gte(workoutSessions.startedAt, weekStart),
            isNotNull(workoutSessions.endedAt),
          ),
        ),
      db
        .select({ cardioSlug: scheduledSessions.cardioSlug })
        .from(scheduledSessions)
        .where(
          and(
            eq(scheduledSessions.userId, userId),
            gte(scheduledSessions.date, weekStartIso),
            lte(scheduledSessions.date, today),
            eq(scheduledSessions.isCompleted, true),
            isNotNull(scheduledSessions.cardioSlug),
          ),
        ),
    ]);

  const latestWeightLog = recentLogs.find((log) => log.weightKg != null) ?? null;
  const latestWeight = latestWeightLog?.weightKg ?? null;
  const heightCm = profile?.heightCm ?? null;

  const bmi =
    latestWeight != null && heightCm != null ? calculateBmi(latestWeight, heightCm) : null;
  const bmiCategory = bmi != null ? getBmiCategory(bmi) : null;

  const calorieBalance = calculateCalorieBalance(
    todayLog?.calorieIntake,
    profile?.dailyCalorieTarget ?? null,
  );

  const weekCaloriesEntries = weekLogs.filter((l) => l.calorieIntake != null);
  const weekAvgCalories =
    weekCaloriesEntries.length > 0
      ? Math.round(
          weekCaloriesEntries.reduce((s, l) => s + l.calorieIntake!, 0) / weekDaysElapsed,
        )
      : null;

  const weekSessionsCount = weekSessionsResult[0]?.count ?? 0;
  const weekCompletedCardioSlugs = weekCardioResult
    .map((r) => r.cardioSlug)
    .filter((s): s is string => s != null);

  const measurementDate = latestMeasurement?.measuredOn ?? null;
  const weightDate = latestWeightLog?.logDate ?? null;
  const measurementsHeaderDate =
    measurementDate && weightDate
      ? measurementDate >= weightDate
        ? measurementDate
        : weightDate
      : (measurementDate ?? weightDate);

  return {
    profileComplete: Boolean(profile?.heightCm),
    todayCalories: todayLog?.calorieIntake ?? null,
    calorieBalance,
    dailyCalorieTarget: profile?.dailyCalorieTarget ?? null,
    weekAvgCalories,
    weekSessionsCount,
    latestWeight,
    latestWeightDate: weightDate,
    bmi,
    bmiCategory: bmiCategory ? formatBmiCategory(bmiCategory) : null,
    latestMeasurement,
    measurementsHeaderDate,
    lookingForwardTo: profile?.lookingForwardTo ?? null,
    vibe: profile?.vibe ?? null,
    weekCompletedCardioSlugs,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
