import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  bodyMeasurements,
  dailyBodyLogs,
  scheduledSessions,
  userProfiles,
  workoutSessions,
} from "@/db/schema";
import { scopeBy } from "@/lib/auth/scope";

export type FlowRange = "week" | "month" | "year";

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
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  hasWorkout: boolean;
}

export interface BodyflowTrends {
  week: BodyflowDay[];
  month: BodyflowDay[];
  year: BodyflowDay[];
  calorieTarget: number | null;
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
  measuresByDate: Map<
    string,
    { chestCm: number | null; waistCm: number | null; hipCm: number | null }
  >;
  workoutDates: Set<string>;
}

function buildDay(iso: string, lk: DayLookups): BodyflowDay {
  const d = new Date(`${iso}T12:00:00`);
  const log = lk.logsByDate.get(iso);
  const measure = lk.measuresByDate.get(iso);
  return {
    date: iso,
    weekdayShort: WEEKDAY_SHORT[d.getDay()],
    dayOfMonth: d.getDate(),
    isFuture: iso > lk.todayIso,
    isToday: iso === lk.todayIso,
    calorieIntake: log?.calorieIntake ?? null,
    weightKg: log?.weightKg ?? null,
    chestCm: measure?.chestCm ?? null,
    waistCm: measure?.waistCm ?? null,
    hipCm: measure?.hipCm ?? null,
    hasWorkout: lk.workoutDates.has(iso),
  };
}

/**
 * Fetches trend data for the Bodyflow overview (nutrientflow, measureflow, trainingflow).
 * Returns three time-range windows: week (Mon–Sun), month (trailing 30d), year (trailing 365d).
 * Each window contains daily data with calories, measurements, and workout flags.
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

  // 30-day window.
  const monthStart = new Date(referenceDate);
  monthStart.setDate(monthStart.getDate() - 29);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartIso = localIsoDate(monthStart);

  // 365-day window.
  const yearStart = new Date(referenceDate);
  yearStart.setDate(yearStart.getDate() - 364);
  yearStart.setHours(0, 0, 0, 0);
  const yearStartIso = localIsoDate(yearStart);

  const fetchStartIso = yearStartIso;

  const [profile, logs, measures, strengthSessions, cardioSessions] = await Promise.all([
    db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, userId) }),
    db.query.dailyBodyLogs.findMany({
      where: and(
        scopeBy(dailyBodyLogs.userId, userId),
        gte(dailyBodyLogs.logDate, fetchStartIso),
        lte(dailyBodyLogs.logDate, todayIso),
      ),
    }),
    db.query.bodyMeasurements.findMany({
      where: and(
        scopeBy(bodyMeasurements.userId, userId),
        gte(bodyMeasurements.measuredOn, fetchStartIso),
        lte(bodyMeasurements.measuredOn, todayIso),
      ),
    }),
    db
      .select({ startedAt: workoutSessions.startedAt })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          gte(workoutSessions.startedAt, yearStart),
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
  ]);

  const logsByDate = new Map<string, { calorieIntake: number | null; weightKg: number | null }>();
  for (const l of logs) {
    logsByDate.set(l.logDate, { calorieIntake: l.calorieIntake, weightKg: l.weightKg });
  }

  const measuresByDate = new Map<
    string,
    { chestCm: number | null; waistCm: number | null; hipCm: number | null }
  >();
  for (const m of measures) {
    measuresByDate.set(m.measuredOn, { chestCm: m.chestCm, waistCm: m.waistCm, hipCm: m.hipCm });
  }

  const workoutDates = new Set<string>();
  for (const s of strengthSessions) workoutDates.add(localIsoDate(new Date(s.startedAt)));
  for (const c of cardioSessions) workoutDates.add(c.date);

  const lookups: DayLookups = { todayIso, logsByDate, measuresByDate, workoutDates };

  const week: BodyflowDay[] = [];
  for (let i = 0; i < 7; i++) {
    week.push(buildDay(addIso(weekStartIso, i), lookups));
  }

  const month: BodyflowDay[] = [];
  for (let i = 0; i < 30; i++) {
    month.push(buildDay(addIso(monthStartIso, i), lookups));
  }

  const year: BodyflowDay[] = [];
  for (let i = 0; i < 365; i++) {
    year.push(buildDay(addIso(yearStartIso, i), lookups));
  }

  return {
    week,
    month,
    year,
    calorieTarget: profile?.dailyCalorieTarget ?? null,
  };
}

function addIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localIsoDate(d);
}
