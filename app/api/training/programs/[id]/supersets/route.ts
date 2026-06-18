import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { createSuperset, removeSuperset } from "@/lib/training/programs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { exerciseIds } = body;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!Array.isArray(exerciseIds) || exerciseIds.length < 2 || !exerciseIds.every((id) => typeof id === "string" && UUID_RE.test(id))) {
    return NextResponse.json({ error: "exerciseIds (min 2 valid UUIDs) required" }, { status: 400 });
  }
  const superset = await createSuperset(id, userId, exerciseIds);
  if (!superset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(superset, { status: 201 });
}

export async function DELETE(req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { supersetId } = body;
  if (!supersetId) return NextResponse.json({ error: "supersetId required" }, { status: 400 });
  const ok = await removeSuperset(supersetId, id, userId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
