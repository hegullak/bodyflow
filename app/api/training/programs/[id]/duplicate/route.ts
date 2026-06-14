import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { duplicateProgram } from "@/lib/training/programs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id } = await params;
  const copy = await duplicateProgram(id, userId);
  if (!copy) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(copy, { status: 201 });
}
