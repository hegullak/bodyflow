/**
 * Weight trend analysis domain.
 * Pure logic for weight tracking, trends, and metrics.
 */

import { z } from "zod";

export const WeightRecordSchema = z.object({
  date: z.date(),
  weightKg: z.number().min(20).max(500),
});

export type WeightRecord = z.infer<typeof WeightRecordSchema>;

export type WeightTrend = "gaining" | "stable" | "losing";

/**
 * Calculate average weight over period.
 */
export function calculateAverageWeight(records: WeightRecord[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((sum, r) => sum + r.weightKg, 0);
  return total / records.length;
}

/**
 * Detect weight trend from records.
 */
export function detectWeightTrend(records: WeightRecord[]): WeightTrend {
  if (records.length < 2) return "stable";

  const sorted = [...records].sort((a, b) => a.date.getTime() - b.date.getTime());
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const avgFirst = calculateAverageWeight(firstHalf);
  const avgSecond = calculateAverageWeight(secondHalf);

  const threshold = 0.5;
  if (avgSecond - avgFirst > threshold) return "gaining";
  if (avgFirst - avgSecond > threshold) return "losing";
  return "stable";
}

/**
 * Calculate weight change from start to end.
 */
export function calculateWeightChange(start: number, end: number): number {
  return end - start;
}

/**
 * Calculate weight change percentage.
 */
export function calculateWeightChangePercentage(start: number, end: number): number {
  if (start === 0) return 0;
  return ((end - start) / start) * 100;
}

/**
 * Estimate time to goal weight.
 * Assumes linear progression at recent rate.
 */
export function estimateTimeToGoal(
  currentWeight: number,
  goalWeight: number,
  recentWeeklyChange: number,
): number | null {
  if (recentWeeklyChange === 0) return null;
  const weightDifference = goalWeight - currentWeight;
  return Math.abs(weightDifference / recentWeeklyChange);
}

/**
 * Calculate stability score (0-1).
 * Lower variance = higher stability.
 */
export function calculateStabilityScore(records: WeightRecord[]): number {
  if (records.length < 2) return 1;

  const avg = calculateAverageWeight(records);
  const variance = records.reduce((sum, r) => sum + Math.pow(r.weightKg - avg, 2), 0) / records.length;
  const stdDev = Math.sqrt(variance);

  // Scale: 0 at 10kg variance, 1 at 0kg variance
  return Math.max(0, 1 - stdDev / 10);
}

/**
 * Check if weight is within healthy range for height.
 * Uses BMI (kg/m²): 18.5-24.9 is normal.
 */
export function isHealthyBMI(weightKg: number, heightM: number): boolean {
  if (heightM <= 0) return false;
  const bmi = weightKg / (heightM * heightM);
  return bmi >= 18.5 && bmi <= 24.9;
}

/**
 * Calculate BMI.
 */
export function calculateBMI(weightKg: number, heightM: number): number {
  if (heightM <= 0) return 0;
  return weightKg / (heightM * heightM);
}
