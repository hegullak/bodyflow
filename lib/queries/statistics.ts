import { asc, gte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { bodyMeasurements, dailyBodyLogs } from "@/db/schema";
import { scopeBy } from "@/lib/auth/scope";
import { buildMonthlyStats, buildYearlyStats } from "@/lib/statistics/period-stats";

const STATS_FROM_YEAR = 2020;
const STATS_FROM_DATE = `${STATS_FROM_YEAR}-01-01`;

export async function getStatisticsData(userId: string) {
  const db = getDb();

  const [weights, measurements] = await Promise.all([
    db
      .select({
        logDate: dailyBodyLogs.logDate,
        weightKg: dailyBodyLogs.weightKg,
      })
      .from(dailyBodyLogs)
      .where(scopeBy(dailyBodyLogs.userId, userId, gte(dailyBodyLogs.logDate, STATS_FROM_DATE)))
      .orderBy(asc(dailyBodyLogs.logDate)),
    db
      .select()
      .from(bodyMeasurements)
      .where(scopeBy(bodyMeasurements.userId, userId, gte(bodyMeasurements.measuredOn, STATS_FROM_DATE)))
      .orderBy(asc(bodyMeasurements.measuredOn)),
  ]);

  const weightPoints = weights
    .filter((row) => row.weightKg != null)
    .map((row) => ({ date: row.logDate, value: row.weightKg as number }));

  const measurementPoints = measurements.map((m) => ({
    measuredOn: m.measuredOn,
    waistCm: m.waistCm,
    chestCm: m.chestCm,
    hipCm: m.hipCm,
  }));

  const monthly = buildMonthlyStats({
    weights: weightPoints,
    measurements: measurementPoints,
    fromYear: STATS_FROM_YEAR,
  });

  const yearly = buildYearlyStats({
    weights: weightPoints,
    measurements: measurementPoints,
    fromYear: STATS_FROM_YEAR,
  });

  const latestMeasurement = measurements.at(-1) ?? null;
  const latestWeight = weights.filter((w) => w.weightKg != null).at(-1) ?? null;

  return {
    monthly,
    yearly,
    latestMeasurement,
    latestWeight,
    totalMeasurements: measurements.length,
    totalWeightLogs: weightPoints.length,
  };
}

export type StatisticsData = Awaited<ReturnType<typeof getStatisticsData>>;
