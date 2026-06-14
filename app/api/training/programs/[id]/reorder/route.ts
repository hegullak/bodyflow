import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { reorderProgramExercises } from "@/lib/training/programs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { orderedIds } = body;
  if (!Array.isArray(orderedIds)) {
    return NextResponse.json({ error: "orderedIds array required" }, { status: 400 });
  }
  const ok = await reorderProgramExercises(id, userId, orderedIds);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
