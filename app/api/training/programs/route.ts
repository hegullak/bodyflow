import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { createProgram, listPrograms } from "@/lib/training/programs";

export async function GET() {
  const userId = await requireUserId();
  const programs = await listPrograms(userId);
  return NextResponse.json(programs);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const program = await createProgram(userId, name);
  return NextResponse.json(program, { status: 201 });
}
