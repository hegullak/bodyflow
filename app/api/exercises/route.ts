import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { isRateLimited } from "@/lib/rate-limit";
import { listExercises } from "@/lib/exercises/catalog";
import { logger } from "@/lib/logger";

const MAX_LIMIT = 100;

export async function GET(req: Request) {
  const userId = await requireUserId();

  if (isRateLimited(`exercises:${userId}`, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? searchParams.get("q") ?? undefined;
  const bodyPart = searchParams.get("bodyPart") ?? undefined;
  const targetMuscle = searchParams.get("targetMuscle") ?? undefined;
  const equipment = searchParams.get("equipment") ?? undefined;
  const limit = Math.min(Math.max(1, Number(searchParams.get("limit") ?? 20)), MAX_LIMIT);
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0));

  try {
    const result = await listExercises({ search, bodyPart, targetMuscle, equipment, limit, offset });
    return NextResponse.json(result);
  } catch (err) {
    logger.error("ExerciseCatalog", "listExercises failed", {
      reason: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Exercise search failed." }, { status: 500 });
  }
}
