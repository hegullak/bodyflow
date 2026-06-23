/**
 * Battery flow domain types.
 * Handles energy levels and fatigue tracking.
 */

export type EnergyLevel = "depleted" | "low" | "moderate" | "high" | "peak";

export type BatteryCheckIn = {
  date: Date;
  energyLevel: EnergyLevel;
  fatigue: number; // 0-10
};

export type BatterySummary = {
  averageEnergy: number;
  averageFatigue: number;
  energyTrend: "depleting" | "stable" | "recovering";
  recommendAction: "rest" | "maintain" | "push";
};

export const ENERGY_SCORES: Record<EnergyLevel, number> = {
  depleted: 1,
  low: 2,
  moderate: 3,
  high: 4,
  peak: 5,
};
