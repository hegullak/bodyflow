import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { isWithingsConfigured } from "@/lib/withings/config";
import { syncWithingsForWithingsUser } from "@/lib/withings/sync";

export async function POST(request: Request) {
  if (!isWithingsConfigured()) {
    return NextResponse.json({ ok: true });
  }

  const raw = await request.text();
  const params = new URLSearchParams(raw);
  const withingsUserId = params.get("userid");
  const startdate = params.get("startdate");
  const enddate = params.get("enddate");

  if (!withingsUserId) {
    return NextResponse.json({ ok: true });
  }

  const range =
    startdate && enddate
      ? { startdate: Number(startdate), enddate: Number(enddate) }
      : undefined;

  const result = await syncWithingsForWithingsUser(withingsUserId, range);
  logger.info("Withings", "Webhook processed", {
    withingsUserId,
    applied: result.applied,
    synced: result.synced,
  });

  if (result.synced) {
    revalidatePath("/dashboard");
  }

  return NextResponse.json({ ok: true });
}
