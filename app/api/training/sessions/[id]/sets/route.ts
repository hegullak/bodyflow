import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { logSet, unlogSet } from "@/lib/training/sessions";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { programExerciseId, setNumber } = body;
  if (!programExerciseId || typeof setNumber !== "number") {
    return NextResponse.json({ error: "programExerciseId and setNumber required" }, { status: 400 });
  }
  const log = await logSet(id, userId, programExerciseId, setNumber);
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(log, { status: 201 });
}

export async function DELETE(req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { programExerciseId, setNumber } = body;
  if (!programExerciseId || typeof setNumber !== "number") {
    return NextResponse.json({ error: "programExerciseId and setNumber required" }, { status: 400 });
  }
  await unlogSet(id, userId, programExerciseId, setNumber);
  return new NextResponse(null, { status: 204 });
}
