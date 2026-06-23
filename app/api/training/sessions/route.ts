import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { getSessionHistory, startSession } from "@/features/training/sessions";

export async function GET() {
  const userId = await requireUserId();
  const history = await getSessionHistory(userId);
  return NextResponse.json(history);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  const body = await req.json().catch(() => ({}));
  const { programId } = body;
  if (!programId) return NextResponse.json({ error: "programId required" }, { status: 400 });
  const session = await startSession(userId, programId);
  if (!session) return NextResponse.json({ error: "Program not found" }, { status: 404 });
  return NextResponse.json(session, { status: 201 });
}
