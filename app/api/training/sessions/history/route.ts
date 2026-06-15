import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { getSessionHistory } from "@/lib/training/sessions";

export async function GET() {
  const userId = await requireUserId();
  const history = await getSessionHistory(userId);
  return NextResponse.json(history);
}
