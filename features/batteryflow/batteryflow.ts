/**
 * Battery flow domain logic.
 * Pure, deterministic calculations for energy and fatigue.
 */

import type { BatteryCheckIn, BatterySummary } from "./types";
import { ENERGY_SCORES } from "./types";

/**
 * Calculate average energy level (0-1).
 */
export function calculateAverageEnergy(checkIns: BatteryCheckIn[]): number {
  if (checkIns.length === 0) return 0;
  const total = checkIns.reduce((sum, c) => sum + ENERGY_SCORES[c.energyLevel], 0);
  return total / checkIns.length / 5;
}

/**
 * Calculate average fatigue (0-1).
 */
export function calculateAverageFatigue(checkIns: BatteryCheckIn[]): number {
  if (checkIns.length === 0) return 0;
  const total = checkIns.reduce((sum, c) => sum + c.fatigue, 0);
  return total / checkIns.length / 10;
}

/**
 * Detect energy trend from recent check-ins.
 */
export function detectEnergyTrend(
  checkIns: BatteryCheckIn[],
): "depleting" | "stable" | "recovering" {
  if (checkIns.length < 2) return "stable";

  const recent = checkIns.slice(-5);
  const energies = recent.map(c => ENERGY_SCORES[c.energyLevel]);
  const trend = energies[energies.length - 1] - energies[0];

  if (trend < -1) return "depleting";
  if (trend > 1) return "recovering";
  return "stable";
}

/**
 * Recommend action based on current state.
 */
export function recommendAction(
  avgEnergy: number,
  avgFatigue: number,
): "rest" | "maintain" | "push" {
  if (avgFatigue > 0.7 || avgEnergy < 0.3) return "rest";
  if (avgEnergy > 0.8 && avgFatigue < 0.3) return "push";
  return "maintain";
}

/**
 * Generate battery summary from check-ins.
 */
export function generateBatterySummary(checkIns: BatteryCheckIn[]): BatterySummary {
  const avgEnergy = calculateAverageEnergy(checkIns);
  const avgFatigue = calculateAverageFatigue(checkIns);

  return {
    averageEnergy: avgEnergy,
    averageFatigue: avgFatigue,
    energyTrend: detectEnergyTrend(checkIns),
    recommendAction: recommendAction(avgEnergy, avgFatigue),
  };
}

/**
 * Battery percentage score (0-100).
 * Combines energy level and inverse of fatigue.
 */
export function calculateBatteryPercentage(
  avgEnergy: number,
  avgFatigue: number,
): number {
  const energyContribution = avgEnergy * 100 * 0.6;
  const fatigueContribution = (1 - avgFatigue) * 100 * 0.4;
  return Math.round(energyContribution + fatigueContribution);
}

/**
 * Time to recovery in hours based on current fatigue.
 * Assumes 1 hour of sleep/rest recovers ~0.1 fatigue.
 */
export function estimateRecoveryTime(avgFatigue: number): number {
  const fatiguePoints = avgFatigue * 10;
  return Math.ceil(fatiguePoints * 1.5);
}
