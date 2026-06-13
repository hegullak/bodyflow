import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { isRateLimited } from "@/lib/rate-limit";
import { getExerciseById } from "@/lib/exercises/catalog";
import { logger } from "@/lib/logger";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();

  if (isRateLimited(`exercises:${userId}`, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid exercise id." }, { status: 400 });
  }

  try {
    const exercise = await getExerciseById(id);
    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found." }, { status: 404 });
    }
    return NextResponse.json(exercise);
  } catch (err) {
    logger.error("ExerciseCatalog", "getExerciseById failed", {
      reason: err instanceof Error ? err.message : String(err),
      id,
    });
    return NextResponse.json({ error: "Failed to fetch exercise." }, { status: 500 });
  }
}
