import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { handleWithingsWebhookRequest } from "@/lib/withings/webhook-handler";
import {
  isWithingsWebhookSecretRequired,
} from "@/lib/withings/webhook-auth";

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function POST(request: Request) {
  if (isWithingsWebhookSecretRequired()) {
    logger.warn("Withings", "Webhook rejected missing secret path");
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const raw = await request.text();
  return handleWithingsWebhookRequest(raw);
}
