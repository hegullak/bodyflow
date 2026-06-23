/**
 * Recovery flow domain logic.
 * Pure, deterministic calculations for physical recovery.
 */

import type { RecoveryCheckIn, RecoverySummary, RecoveryIndicator } from "./types";
import { SLEEP_QUALITY_SCORES, SLEEP_RECOMMENDATION_HOURS } from "./types";

/**
 * Calculate average sleep hours from check-ins.
 */
export function calculateAverageSleep(checkIns: RecoveryCheckIn[]): number {
  if (checkIns.length === 0) return 0;
  const total = checkIns.reduce((sum, c) => sum + c.sleepHours, 0);
  return total / checkIns.length;
}

/**
 * Calculate average sleep quality score (0-1).
 */
export function calculateAverageSleepQuality(checkIns: RecoveryCheckIn[]): number {
  if (checkIns.length === 0) return 0;
  const total = checkIns.reduce((sum, c) => sum + SLEEP_QUALITY_SCORES[c.sleepQuality], 0);
  return total / checkIns.length / 4;
}

/**
 * Determine recovery status based on sleep.
 */
export function determineRecoveryStatus(avgSleep: number): RecoveryIndicator {
  if (avgSleep >= SLEEP_RECOMMENDATION_HOURS + 1) return "high";
  if (avgSleep >= SLEEP_RECOMMENDATION_HOURS - 1) return "moderate";
  return "low";
}

/**
 * Assess rest balance vs training load.
 * Requires rest days relative to training frequency.
 */
export function assessRestBalance(
  restDaysPerWeek: number,
  trainingDaysPerWeek: number,
): "overtraining" | "balanced" | "underactive" {
  const restRatio = restDaysPerWeek / 7;
  const trainingRatio = trainingDaysPerWeek / 7;

  if (trainingRatio > 0.6 && restRatio < 0.2) return "overtraining";
  if (restRatio < 0.1) return "underactive";
  return "balanced";
}

/**
 * Generate recovery summary from check-ins.
 */
export function generateRecoverySummary(
  checkIns: RecoveryCheckIn[],
  trainingDaysPerWeek = 4,
): RecoverySummary {
  const avgSleep = calculateAverageSleep(checkIns);
  const avgRestDays = checkIns.length > 0 ? checkIns.reduce((sum, c) => sum + c.restDays, 0) / checkIns.length : 0;

  return {
    averageSleepHours: avgSleep,
    averageSleepQuality: calculateAverageSleepQuality(checkIns),
    recoveryStatus: determineRecoveryStatus(avgSleep),
    restBalance: assessRestBalance(avgRestDays, trainingDaysPerWeek),
  };
}

/**
 * Sleep debt in hours vs recommended sleep.
 */
export function calculateSleepDebt(
  avgSleep: number,
  daysTracked: number,
): number {
  const debtPerDay = Math.max(0, SLEEP_RECOMMENDATION_HOURS - avgSleep);
  return debtPerDay * daysTracked;
}

/**
 * Recovery readiness score (0-1).
 * Combines sleep quality, quantity, and rest days.
 */
export function calculateRecoveryScore(
  avgSleep: number,
  sleepQuality: number,
  restBalance: "overtraining" | "balanced" | "underactive",
): number {
  const sleepScore = Math.min(avgSleep / SLEEP_RECOMMENDATION_HOURS, 1);
  const qualityScore = sleepQuality;
  const restScore = restBalance === "overtraining" ? 0.5 : restBalance === "underactive" ? 0.7 : 1;

  return (sleepScore + qualityScore + restScore) / 3;
}
