import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { deleteSession, endSession, getSessionDetail } from "@/lib/training/sessions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id } = await params;
  const session = await getSessionDetail(id, userId);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(session);
}

export async function PUT(_req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id } = await params;
  const session = await endSession(id, userId);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(session);
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id } = await params;
  await deleteSession(id, userId);
  return NextResponse.json({ ok: true });
}
