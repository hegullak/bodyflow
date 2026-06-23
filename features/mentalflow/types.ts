/**
 * Mental flow domain types.
 * Handles mood, stress, and overall mental wellbeing tracking.
 */

export type MoodLevel = "poor" | "low" | "neutral" | "good" | "excellent";

export type StressLevel = "high" | "moderate" | "low" | "minimal";

export type MentalCheckIn = {
  date: Date;
  mood: MoodLevel;
  stress: StressLevel;
  notes?: string;
};

export type MentalSummary = {
  averageMood: number;
  averageStress: number;
  moodTrend: "improving" | "stable" | "declining";
  recentCheckIns: MentalCheckIn[];
};

export const MOOD_SCORES: Record<MoodLevel, number> = {
  poor: 1,
  low: 2,
  neutral: 3,
  good: 4,
  excellent: 5,
};

export const STRESS_SCORES: Record<StressLevel, number> = {
  high: 1,
  moderate: 2,
  low: 3,
  minimal: 4,
};
