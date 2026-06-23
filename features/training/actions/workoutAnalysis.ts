"use server";

import { z } from "zod";
import { and, desc, eq, isNull, gte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { requireUserId } from "@/lib/auth/current-user";
import { type ActionResult, flattenZodErrors } from "@/shared/actions/types";
import {
  calculateTrainingVolume,
  calculateIntensity,
  calculateAcuteLoad,
  calculateChronicLoad,
  calculateTSB,
  calculateRecoveryDemand,
  estimateRecoveryTime,
  needsRestDay,
} from "../trainingLoad";

const getWorkoutAnalysisSchema = z.object({
  recentDays: z.number().min(7).max(90).default(30),
  sessionDurationMinutes: z.number().min(1).default(60),
  sessionExerciseCount: z.number().min(1).default(4),
  sessionTotalReps: z.number().min(0).default(0),
  sessionTotalWeight: z.number().min(0).default(0),
});

export type WorkoutAnalysisResult = {
  acuteLoad: number;
  chronicLoad: number;
  trainingStressBalance: number;
  recoveryDemand: number;
  estimatedRecoveryHours: number;
  shouldRestToday: boolean;
  statusMessage: string;
};

/**
 * Analyze workout load with calculations.
 * Validates input with Zod, calculates acute/chronic load and recovery needs.
 */
export async function analyzeWorkoutLoadAction(
  input: unknown,
): Promise<ActionResult<WorkoutAnalysisResult>> {
  try {
    const userId = await requireUserId();
    const params = getWorkoutAnalysisSchema.parse(input);

    const db = getDb();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - params.recentDays);

    // Get recent workout sessions
    const sessions = await db.query.workoutSessions.findMany({
      where: and(
        eq(workoutSessions.userId, userId),
        gte(workoutSessions.startedAt, startDate),
        isNull(workoutSessions.deletedAt),
      ),
      orderBy: desc(workoutSessions.startedAt),
      limit: 90,
    });

    // Calculate loads for recent sessions
    const acuteLoads = sessions.map(session => {
      const duration = session.endedAt
        ? (session.endedAt.getTime() - session.startedAt.getTime()) / 60000
        : params.sessionDurationMinutes;
      // Use mock data since we don't have exercise details here
      const intensity = calculateIntensity(duration, params.sessionTotalWeight * params.sessionTotalReps, 4);
      return calculateAcuteLoad(duration, intensity, 4);
    });

    // Calculate current session load
    const volume = calculateTrainingVolume(
      params.sessionTotalReps,
      params.sessionTotalWeight,
    );
    const currentIntensity = calculateIntensity(
      params.sessionDurationMinutes,
      volume,
      params.sessionExerciseCount,
    );
    const currentAcuteLoad = calculateAcuteLoad(
      params.sessionDurationMinutes,
      currentIntensity,
      params.sessionExerciseCount,
    );

    const chronicLoad = calculateChronicLoad(acuteLoads);
    const tsb = calculateTSB(chronicLoad, currentAcuteLoad);
    const recoveryDemand = calculateRecoveryDemand(currentIntensity, params.sessionDurationMinutes);

    // Check consecutive workout days
    const now = new Date();
    let consecutiveDays = 0;
    for (let i = 0; i < 10; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() - i);
      const hasWorkout = sessions.some(
        s =>
          s.startedAt.toDateString() === checkDate.toDateString(),
      );
      if (hasWorkout) consecutiveDays++;
      else break;
    }

    const shouldRest = needsRestDay(acuteLoads, consecutiveDays);

    let statusMessage = "Normal training load.";
    if (tsb < -20) statusMessage = "Highly fatigued. Consider rest.";
    else if (tsb < -10) statusMessage = "Fatigued. Active recovery recommended.";
    else if (tsb > 10) statusMessage = "Fresh. Good time for intensity.";

    return {
      ok: true,
      data: {
        acuteLoad: Math.round(currentAcuteLoad * 10) / 10,
        chronicLoad: Math.round(chronicLoad * 10) / 10,
        trainingStressBalance: Math.round(tsb * 10) / 10,
        recoveryDemand: Math.round(recoveryDemand * 100) / 100,
        estimatedRecoveryHours: Math.round(estimateRecoveryTime(currentIntensity, volume) * 10) / 10,
        shouldRestToday: shouldRest,
        statusMessage,
      },
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        error: "Invalid workout analysis parameters",
        fieldErrors: flattenZodErrors(err),
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to analyze workout load",
    };
  }
}
