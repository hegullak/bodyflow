import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { removeProgramExercise, updateProgramExercise } from "@/lib/training/programs";

type Params = { params: Promise<{ id: string; exerciseId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id, exerciseId } = await params;
  const body = await req.json().catch(() => ({}));
  const { sets, reps, restSeconds, isBodyweight } = body;

  const patch: Record<string, unknown> = {};
  if (typeof sets === "number") patch.sets = sets;
  if (typeof reps === "number") patch.reps = reps;
  if (typeof restSeconds === "number") patch.restSeconds = restSeconds;
  if (typeof isBodyweight === "boolean") patch.isBodyweight = isBodyweight;

  const updated = await updateProgramExercise(exerciseId, id, userId, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id, exerciseId } = await params;
  const ok = await removeProgramExercise(exerciseId, id, userId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
