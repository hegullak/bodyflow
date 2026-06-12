import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { isWithingsConfigured } from "@/lib/withings/config";
import { syncWithingsForWithingsUser } from "@/lib/withings/sync";

const WEIGHT_APPLI = "1";

export async function handleWithingsWebhookRequest(
  rawBody: string,
): Promise<NextResponse> {
  if (!isWithingsConfigured()) {
    return NextResponse.json({ ok: true });
  }

  const params = new URLSearchParams(rawBody);
  const withingsUserId = params.get("userid");
  const appli = params.get("appli");
  const startdate = params.get("startdate");
  const enddate = params.get("enddate");

  if (!withingsUserId) {
    return NextResponse.json({ ok: true });
  }

  if (appli && appli !== WEIGHT_APPLI) {
    logger.info("Withings", "Webhook ignored unsupported appli", { appli });
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
    reason: result.reason,
  });

  if (result.synced) {
    revalidatePath("/dashboard");
  }

  return NextResponse.json({ ok: true });
}
