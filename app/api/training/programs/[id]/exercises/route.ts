import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { addExerciseToProgram } from "@/lib/training/programs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { exerciseId, sets, reps, restSeconds, isBodyweight } = body;
  if (!exerciseId) return NextResponse.json({ error: "exerciseId required" }, { status: 400 });

  const row = await addExerciseToProgram(id, userId, exerciseId, {
    sets: typeof sets === "number" ? sets : 3,
    reps: typeof reps === "number" ? reps : 12,
    restSeconds: typeof restSeconds === "number" ? restSeconds : 120,
    isBodyweight: false,
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row, { status: 201 });
}
