import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { bodyMeasurements, dailyBodyLogs } from "@/db/schema";
import { scopeBy } from "@/lib/auth/scope";

export type CheckInSnapshot = {
  logDate: string;
  weightKg: number | null;
  waistCm: number | null;
  chestCm: number | null;
  hipCm: number | null;
};

function mergeSnapshots(
  logs: Array<{ logDate: string; weightKg: number | null }>,
  measurements: Array<{
    measuredOn: string;
    waistCm: number | null;
    chestCm: number | null;
    hipCm: number | null;
  }>,
): CheckInSnapshot[] {
  const byDate = new Map<string, CheckInSnapshot>();

  for (const log of logs) {
    const existing = byDate.get(log.logDate) ?? {
      logDate: log.logDate,
      weightKg: null,
      waistCm: null,
      chestCm: null,
      hipCm: null,
    };
    existing.weightKg = log.weightKg ?? existing.weightKg;
    byDate.set(log.logDate, existing);
  }

  for (const row of measurements) {
    const existing = byDate.get(row.measuredOn) ?? {
      logDate: row.measuredOn,
      weightKg: null,
      waistCm: null,
      chestCm: null,
      hipCm: null,
    };
    existing.waistCm = row.waistCm ?? existing.waistCm;
    existing.chestCm = row.chestCm ?? existing.chestCm;
    existing.hipCm = row.hipCm ?? existing.hipCm;
    byDate.set(row.measuredOn, existing);
  }

  return [...byDate.values()]
    .filter(
      (row) =>
        row.weightKg != null ||
        row.waistCm != null ||
        row.chestCm != null ||
        row.hipCm != null,
    )
    .sort((a, b) => b.logDate.localeCompare(a.logDate));
}

export async function getCheckInHistory(userId: string, limit = 10): Promise<CheckInSnapshot[]> {
  const db = getDb();
  const [logs, measurements] = await Promise.all([
    db.query.dailyBodyLogs.findMany({
      where: scopeBy(dailyBodyLogs.userId, userId),
      orderBy: [desc(dailyBodyLogs.logDate)],
      limit: 60,
      columns: { logDate: true, weightKg: true },
    }),
    db.query.bodyMeasurements.findMany({
      where: scopeBy(bodyMeasurements.userId, userId),
      orderBy: [desc(bodyMeasurements.measuredOn)],
      limit: 60,
      columns: { measuredOn: true, waistCm: true, chestCm: true, hipCm: true },
    }),
  ]);

  return mergeSnapshots(logs, measurements).slice(0, limit);
}

export async function getCheckInForDate(
  userId: string,
  logDate: string,
): Promise<CheckInSnapshot | null> {
  const db = getDb();
  const [log, measurement] = await Promise.all([
    db.query.dailyBodyLogs.findFirst({
      where: scopeBy(dailyBodyLogs.userId, userId, eq(dailyBodyLogs.logDate, logDate)),
      columns: { logDate: true, weightKg: true },
    }),
    db.query.bodyMeasurements.findFirst({
      where: scopeBy(bodyMeasurements.userId, userId, eq(bodyMeasurements.measuredOn, logDate)),
      columns: { measuredOn: true, waistCm: true, chestCm: true, hipCm: true },
    }),
  ]);

  if (!log && !measurement) return null;

  return {
    logDate,
    weightKg: log?.weightKg ?? null,
    waistCm: measurement?.waistCm ?? null,
    chestCm: measurement?.chestCm ?? null,
    hipCm: measurement?.hipCm ?? null,
  };
}

export function getPreviousCheckIn(
  history: CheckInSnapshot[],
  logDate: string,
): CheckInSnapshot | null {
  return history.find((row) => row.logDate < logDate) ?? null;
}

export type CheckInDiff = {
  weightKg: number | null;
  waistCm: number | null;
  chestCm: number | null;
  hipCm: number | null;
};

export function computeCheckInDiff(
  current: CheckInSnapshot,
  previous: CheckInSnapshot | null,
): CheckInDiff | null {
  if (!previous) return null;

  const diff: CheckInDiff = {
    weightKg: null,
    waistCm: null,
    chestCm: null,
    hipCm: null,
  };

  if (current.weightKg != null && previous.weightKg != null) {
    diff.weightKg = Math.round((current.weightKg - previous.weightKg) * 10) / 10;
  }
  if (current.waistCm != null && previous.waistCm != null) {
    diff.waistCm = Math.round((current.waistCm - previous.waistCm) * 10) / 10;
  }
  if (current.chestCm != null && previous.chestCm != null) {
    diff.chestCm = Math.round((current.chestCm - previous.chestCm) * 10) / 10;
  }
  if (current.hipCm != null && previous.hipCm != null) {
    diff.hipCm = Math.round((current.hipCm - previous.hipCm) * 10) / 10;
  }

  if (
    diff.weightKg == null &&
    diff.waistCm == null &&
    diff.chestCm == null &&
    diff.hipCm == null
  ) {
    return null;
  }

  return diff;
}
