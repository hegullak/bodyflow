import { and, count, desc, eq, gte, isNotNull, lte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { bodyMeasurements, dailyBodyLogs, userProfiles, workoutSessions } from "@/db/schema";
import { scopeBy } from "@/lib/auth/scope";
import {
  calculateBmi,
  calculateCalorieBalance,
  formatBmiCategory,
  getBmiCategory,
} from "@/lib/calculations/body-metrics";
import { todayIsoDate } from "@/lib/utils";

function weekStartDate(ref: Date): Date {
  const d = new Date(ref);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getDashboardData(userId: string, referenceDate = new Date()) {
  const db = getDb();
  const today = todayIsoDate(referenceDate);
  const weekStart = weekStartDate(referenceDate);
  const weekStartIso = weekStart.toISOString().slice(0, 10);

  const [profile, todayLog, recentLogs, latestMeasurement, weekLogs, weekSessionsResult] =
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
          weekCaloriesEntries.reduce((s, l) => s + l.calorieIntake!, 0) /
            weekCaloriesEntries.length,
        )
      : null;

  const weekSessionsCount = weekSessionsResult[0]?.count ?? 0;

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
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
