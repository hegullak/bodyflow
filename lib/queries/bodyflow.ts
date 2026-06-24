import { and, asc, eq, gte, isNotNull, lte } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  bodyMeasurements,
  dailyBodyLogs,
  scheduledSessions,
  userProfiles,
  workoutSessions,
} from "@/db/schema";
import { scopeBy } from "@/lib/auth/scope";

export type FlowRange = "week" | "month";

export interface BodyflowDay {
  /** ISO date (YYYY-MM-DD), local time. */
  date: string;
  /** Short weekday label, e.g. "Man". */
  weekdayShort: string;
  /** Day of month, e.g. 24. */
  dayOfMonth: number;
  /** True when this slot is in the future (no data possible yet). */
  isFuture: boolean;
  /** True when this slot is today. */
  isToday: boolean;
  calorieIntake: number | null;
  weightKg: number | null;
  hasWorkout: boolean;
}

/**
 * A single point in the all-time measurement history.
 * Weight comes from daily_body_log; body measurements from body_measurement.
 * Both tables are merged by date — a date can carry weight only, measurements
 * only, or both when logged the same day.
 */
export interface MeasurementPoint {
  date: string;
  weightKg: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
}

export interface BodyflowTrends {
  week: BodyflowDay[];
  month: BodyflowDay[];
  calorieTarget: number | null;
  /** Full historical measurement series, sorted oldest-first. */
  measurementHistory: MeasurementPoint[];
}

function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const WEEKDAY_SHORT = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];

interface DayLookups {
  todayIso: string;
  logsByDate: Map<string, { calorieIntake: number | null; weightKg: number | null }>;
  workoutDates: Set<string>;
}

function buildDay(iso: string, lk: DayLookups): BodyflowDay {
  const d = new Date(`${iso}T12:00:00`);
  const log = lk.logsByDate.get(iso);
  return {
    date: iso,
    weekdayShort: WEEKDAY_SHORT[d.getDay()],
    dayOfMonth: d.getDate(),
    isFuture: iso > lk.todayIso,
    isToday: iso === lk.todayIso,
    calorieIntake: log?.calorieIntake ?? null,
    weightKg: log?.weightKg ?? null,
    hasWorkout: lk.workoutDates.has(iso),
  };
}

/**
 * Fetches trend data for the Bodyflow overview:
 * - nutrientflow / trainingflow: week (Mon–Sun) and month (trailing 30d) windows
 * - measurementflow: full all-time history, no date limit
 */
export async function getBodyflowTrends(
  userId: string,
  referenceDate = new Date(),
): Promise<BodyflowTrends> {
  const db = getDb();
  const todayIso = localIsoDate(referenceDate);

  // Monday of current week (local time).
  const dow = referenceDate.getDay();
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const weekStart = new Date(referenceDate);
  weekStart.setDate(weekStart.getDate() - daysFromMon);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartIso = localIsoDate(weekStart);

  // 30-day window ends today, starts 29 days ago.
  const monthStart = new Date(referenceDate);
  monthStart.setDate(monthStart.getDate() - 29);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartIso = localIsoDate(monthStart);

  const fetchStartIso = monthStartIso;

  const [
    profile,
    logs,
    strengthSessions,
    cardioSessions,
    allWeights,
    allBodyMeasurements,
  ] = await Promise.all([
    db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, userId) }),
    db.query.dailyBodyLogs.findMany({
      where: and(
        scopeBy(dailyBodyLogs.userId, userId),
        gte(dailyBodyLogs.logDate, fetchStartIso),
        lte(dailyBodyLogs.logDate, todayIso),
      ),
    }),
    db
      .select({ startedAt: workoutSessions.startedAt })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          gte(workoutSessions.startedAt, monthStart),
          isNotNull(workoutSessions.endedAt),
        ),
      ),
    db
      .select({ date: scheduledSessions.date })
      .from(scheduledSessions)
      .where(
        and(
          eq(scheduledSessions.userId, userId),
          gte(scheduledSessions.date, fetchStartIso),
          lte(scheduledSessions.date, todayIso),
          eq(scheduledSessions.isCompleted, true),
          isNotNull(scheduledSessions.cardioSlug),
        ),
      ),
    // All-time weights: every daily log that has a weight entry.
    db.query.dailyBodyLogs.findMany({
      where: and(
        scopeBy(dailyBodyLogs.userId, userId),
        isNotNull(dailyBodyLogs.weightKg),
      ),
      columns: { logDate: true, weightKg: true },
      orderBy: [asc(dailyBodyLogs.logDate)],
    }),
    // All-time body measurements: no date limit.
    db.query.bodyMeasurements.findMany({
      where: scopeBy(bodyMeasurements.userId, userId),
      columns: { measuredOn: true, chestCm: true, waistCm: true, hipCm: true },
      orderBy: [asc(bodyMeasurements.measuredOn)],
    }),
  ]);

  // ── nutrientflow / trainingflow lookups ────────────────────────────────────
  const logsByDate = new Map<string, { calorieIntake: number | null; weightKg: number | null }>();
  for (const l of logs) {
    logsByDate.set(l.logDate, { calorieIntake: l.calorieIntake, weightKg: l.weightKg });
  }

  const workoutDates = new Set<string>();
  for (const s of strengthSessions) workoutDates.add(localIsoDate(new Date(s.startedAt)));
  for (const c of cardioSessions) workoutDates.add(c.date);

  const lookups: DayLookups = { todayIso, logsByDate, workoutDates };

  const week: BodyflowDay[] = [];
  for (let i = 0; i < 7; i++) {
    week.push(buildDay(addIso(weekStartIso, i), lookups));
  }

  const month: BodyflowDay[] = [];
  for (let i = 0; i < 30; i++) {
    month.push(buildDay(addIso(monthStartIso, i), lookups));
  }

  // ── measurementflow: merge all-time weight + body measurements ─────────────
  const weightByDate = new Map<string, number>();
  for (const l of allWeights) {
    if (l.weightKg != null) weightByDate.set(l.logDate, l.weightKg);
  }

  const bodyByDate = new Map<string, { chestCm: number | null; waistCm: number | null; hipCm: number | null }>();
  for (const m of allBodyMeasurements) {
    bodyByDate.set(m.measuredOn, { chestCm: m.chestCm, waistCm: m.waistCm, hipCm: m.hipCm });
  }

  const allDates = new Set([...weightByDate.keys(), ...bodyByDate.keys()]);
  const measurementHistory: MeasurementPoint[] = Array.from(allDates)
    .sort()
    .map((date) => {
      const body = bodyByDate.get(date);
      return {
        date,
        weightKg: weightByDate.get(date) ?? null,
        chestCm: body?.chestCm ?? null,
        waistCm: body?.waistCm ?? null,
        hipCm: body?.hipCm ?? null,
      };
    });

  return {
    week,
    month,
    calorieTarget: profile?.dailyCalorieTarget ?? null,
    measurementHistory,
  };
}

function addIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localIsoDate(d);
}
