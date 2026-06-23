/**
 * Mental flow domain logic.
 * Pure, deterministic calculations for mental wellbeing.
 */

import type { MentalCheckIn, MentalSummary, MoodLevel, StressLevel } from "./types";
import { MOOD_SCORES, STRESS_SCORES } from "./types";

/**
 * Calculate average mood score from recent check-ins.
 * Returns 0-5 scale normalized to 0-1.
 */
export function calculateAverageMood(checkIns: MentalCheckIn[]): number {
  if (checkIns.length === 0) return 0;
  const total = checkIns.reduce((sum, c) => sum + MOOD_SCORES[c.mood], 0);
  return total / checkIns.length / 5;
}

/**
 * Calculate average stress score from recent check-ins.
 * Returns 0-4 scale normalized to 0-1.
 */
export function calculateAverageStress(checkIns: MentalCheckIn[]): number {
  if (checkIns.length === 0) return 0;
  const total = checkIns.reduce((sum, c) => sum + STRESS_SCORES[c.stress], 0);
  return total / checkIns.length / 4;
}

/**
 * Detect mood trend from recent check-ins.
 * Compares first half vs second half to determine direction.
 */
export function detectMoodTrend(
  checkIns: MentalCheckIn[],
): "improving" | "stable" | "declining" {
  if (checkIns.length < 2) return "stable";

  const mid = Math.floor(checkIns.length / 2);
  const firstHalf = checkIns.slice(0, mid);
  const secondHalf = checkIns.slice(mid);

  const firstAvg = calculateAverageMood(firstHalf);
  const secondAvg = calculateAverageMood(secondHalf);

  const threshold = 0.1;
  if (secondAvg - firstAvg > threshold) return "improving";
  if (firstAvg - secondAvg > threshold) return "declining";
  return "stable";
}

/**
 * Generate mental summary from check-ins.
 * Latest check-ins weighted more heavily.
 */
export function generateMentalSummary(checkIns: MentalCheckIn[]): MentalSummary {
  return {
    averageMood: calculateAverageMood(checkIns),
    averageStress: calculateAverageStress(checkIns),
    moodTrend: detectMoodTrend(checkIns),
    recentCheckIns: checkIns.slice(-7),
  };
}

/**
 * Wellness score combining mood and inverse of stress.
 * Returns 0-1 where 1 is optimal mental wellbeing.
 * Stress is inverted: high stress (low number) reduces wellness.
 */
export function calculateWellnessScore(
  mood: MoodLevel,
  stress: StressLevel,
): number {
  const moodScore = MOOD_SCORES[mood] / 5;
  const stressReduction = STRESS_SCORES[stress] / 4;
  return (moodScore + stressReduction) / 2;
}
