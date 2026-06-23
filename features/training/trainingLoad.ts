/**
 * Training load domain calculations.
 * Pure logic for workout intensity, volume, and recovery demand.
 */

import { z } from "zod";

export const WorkoutSessionSchema = z.object({
  date: z.date(),
  durationMinutes: z.number().min(1),
  exerciseCount: z.number().min(1),
  totalReps: z.number().min(0),
  totalWeight: z.number().min(0),
});

export type WorkoutSession = z.infer<typeof WorkoutSessionSchema>;

/**
 * Calculate total training volume (weight × reps).
 */
export function calculateTrainingVolume(totalReps: number, totalWeight: number): number {
  return totalReps * totalWeight;
}

/**
 * Calculate workout intensity (0-1).
 * Based on volume per minute and rep count.
 */
export function calculateIntensity(
  durationMinutes: number,
  volume: number,
  exerciseCount: number,
): number {
  if (durationMinutes === 0) return 0;
  const volumePerMinute = volume / durationMinutes;
  const exerciseDensity = exerciseCount / durationMinutes;

  // Normalize: high intensity is >200 volume/min and >0.2 exercises/min
  const volumeScore = Math.min(volumePerMinute / 200, 1);
  const densityScore = Math.min(exerciseDensity * 5, 1);

  return (volumeScore + densityScore) / 2;
}

/**
 * Calculate acute training load (0-100).
 * Immediate fatigue from single session.
 */
export function calculateAcuteLoad(
  durationMinutes: number,
  intensity: number,
  exerciseCount: number,
): number {
  // Base: 10 points per 30 minutes
  const baseLoad = (durationMinutes / 30) * 10;
  const intensityBonus = intensity * 30;
  const exerciseBonus = Math.min(exerciseCount * 3, 20);

  return Math.min(baseLoad + intensityBonus + exerciseBonus, 100);
}

/**
 * Calculate chronic training load (0-100).
 * Cumulative fatigue from recent training history.
 */
export function calculateChronicLoad(acuteLoads: number[]): number {
  if (acuteLoads.length === 0) return 0;

  // Weighted average: recent sessions weighted more heavily
  const weighted = acuteLoads.reduce((sum, load, idx) => {
    const weight = (idx + 1) / acuteLoads.length;
    return sum + load * weight;
  }, 0);

  return weighted;
}

/**
 * Calculate training stress balance (TSB).
 * Positive = fresh, Negative = fatigued.
 */
export function calculateTSB(chronicalLoad: number, acuteLoad: number): number {
  return acuteLoad - chronicalLoad;
}

/**
 * Determine recovery demand (0-1).
 * Higher = more recovery needed.
 */
export function calculateRecoveryDemand(intensity: number, durationMinutes: number): number {
  const durationScore = Math.min(durationMinutes / 120, 1);
  return (intensity + durationScore) / 2;
}

/**
 * Estimate recovery time in hours.
 * Based on intensity and volume.
 */
export function estimateRecoveryTime(intensity: number, volume: number): number {
  const intensityHours = intensity * 24;
  const volumeFactor = Math.log(Math.max(volume, 1)) * 2;
  return intensityHours + volumeFactor;
}

/**
 * Check if athlete needs rest day.
 * Based on training load and recent history.
 */
export function needsRestDay(
  recentAcuteLoads: number[],
  consecutiveDaysWithWorkout: number,
): boolean {
  if (consecutiveDaysWithWorkout >= 5) return true;

  const avgLoad = recentAcuteLoads.length > 0 ? recentAcuteLoads.reduce((a, b) => a + b, 0) / recentAcuteLoads.length : 0;
  if (avgLoad > 70 && consecutiveDaysWithWorkout >= 3) return true;

  return false;
}
