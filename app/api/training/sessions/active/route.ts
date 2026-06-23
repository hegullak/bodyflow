import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { getActiveSession } from "@/features/training/sessions";

export async function GET() {
  const userId = await requireUserId();
  const session = await getActiveSession(userId);
  if (!session) return NextResponse.json(null);
  return NextResponse.json(session);
}
