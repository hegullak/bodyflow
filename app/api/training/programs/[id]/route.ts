import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { deleteProgram, getProgram, renameProgram } from "@/lib/training/programs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id } = await params;
  const program = await getProgram(id, userId);
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(program);
}

export async function PUT(req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const updated = await renameProgram(id, userId, name);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id } = await params;
  await deleteProgram(id, userId);
  return new NextResponse(null, { status: 204 });
}
