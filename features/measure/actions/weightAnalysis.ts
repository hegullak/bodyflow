"use server";

import { z } from "zod";
import { and, desc, eq, isNull, gte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { requireUserId } from "@/lib/auth/current-user";
import { type ActionResult, flattenZodErrors } from "@/shared/actions/types";
import {
  calculateAverageWeight,
  detectWeightTrend,
  calculateWeightChange,
  calculateWeightChangePercentage,
  estimateTimeToGoal,
  calculateStabilityScore,
  calculateBMI,
  type WeightRecord,
  type WeightTrend,
} from "../weightTrend";

const getWeightAnalysisSchema = z.object({
  daysBack: z.number().min(7).max(365).default(30),
  goalWeightKg: z.number().min(20).max(500).optional(),
  heightM: z.number().min(1.4).max(2.3).optional(),
});

export type WeightAnalysisResult = {
  averageWeight: number;
  weeklyAverage: number;
  trend: WeightTrend;
  stabilityScore: number;
  weightChange: number;
  weightChangePercentage: number;
  bmi: number | null;
  estimatedDaysToGoal: number | null;
  recordCount: number;
};

/**
 * Analyze weight trends with calculations.
 * Validates input with Zod, retrieves records, calculates metrics.
 */
export async function analyzeWeightTrendsAction(
  input: unknown,
): Promise<ActionResult<WeightAnalysisResult>> {
  try {
    const userId = await requireUserId();
    const params = getWeightAnalysisSchema.parse(input);

    const db = getDb();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - params.daysBack);

    const records = await db.query.bodyWeightLogs.findMany({
      where: and(
        eq(bodyWeightLogs.userId, userId),
        gte(bodyWeightLogs.logDate, startDate),
        isNull(bodyWeightLogs.deletedAt),
      ),
      orderBy: desc(bodyWeightLogs.logDate),
      limit: 365,
    });

    const weightRecords: WeightRecord[] = records.map(r => ({
      date: r.logDate,
      weightKg: r.weightKg,
    }));

    if (weightRecords.length === 0) {
      return {
        ok: true,
        data: {
          averageWeight: 0,
          weeklyAverage: 0,
          trend: "stable",
          stabilityScore: 1,
          weightChange: 0,
          weightChangePercentage: 0,
          bmi: null,
          estimatedDaysToGoal: null,
          recordCount: 0,
        },
      };
    }

    const avgWeight = calculateAverageWeight(weightRecords);
    const firstWeight = weightRecords[weightRecords.length - 1].weightKg;
    const latestWeight = weightRecords[0].weightKg;
    const recentWeeklyChange = calculateAverageWeight(
      weightRecords.slice(0, 7),
    ) - calculateAverageWeight(
      weightRecords.slice(7, 14),
    );

    const weeklyAvg = calculateAverageWeight(weightRecords.slice(0, 7));

    return {
      ok: true,
      data: {
        averageWeight: Math.round(avgWeight * 10) / 10,
        weeklyAverage: Math.round(weeklyAvg * 10) / 10,
        trend: detectWeightTrend(weightRecords),
        stabilityScore: calculateStabilityScore(weightRecords),
        weightChange: Math.round(calculateWeightChange(firstWeight, latestWeight) * 10) / 10,
        weightChangePercentage: Math.round(calculateWeightChangePercentage(firstWeight, latestWeight) * 10) / 10,
        bmi: params.heightM ? Math.round(calculateBMI(latestWeight, params.heightM) * 10) / 10 : null,
        estimatedDaysToGoal: params.goalWeightKg
          ? Math.ceil((estimateTimeToGoal(latestWeight, params.goalWeightKg, recentWeeklyChange) ?? 0) * 7)
          : null,
        recordCount: weightRecords.length,
      },
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        error: "Invalid weight analysis parameters",
        fieldErrors: flattenZodErrors(err),
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to analyze weight trends",
    };
  }
}
