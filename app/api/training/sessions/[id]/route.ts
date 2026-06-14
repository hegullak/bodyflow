import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { endSession } from "@/lib/training/sessions";

type Params = { params: Promise<{ id: string }> };

export async function PUT(_req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id } = await params;
  const session = await endSession(id, userId);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(session);
}
