/**
 * Recovery flow domain types.
 * Handles sleep, rest, and physical recovery tracking.
 */

export type SleepQuality = "poor" | "fair" | "good" | "excellent";

export type RecoveryIndicator = "high" | "moderate" | "low";

export type RecoveryCheckIn = {
  date: Date;
  sleepHours: number;
  sleepQuality: SleepQuality;
  restDays: number;
};

export type RecoverySummary = {
  averageSleepHours: number;
  averageSleepQuality: number;
  recoveryStatus: RecoveryIndicator;
  restBalance: "overtraining" | "balanced" | "underactive";
};

export const SLEEP_QUALITY_SCORES: Record<SleepQuality, number> = {
  poor: 1,
  fair: 2,
  good: 3,
  excellent: 4,
};

export const SLEEP_RECOMMENDATION_HOURS = 7;
export const MIN_REST_DAYS_PER_WEEK = 1;
