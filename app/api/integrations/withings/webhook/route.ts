import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { handleWithingsWebhookRequest } from "@/lib/withings/webhook-handler";
import {
  isWithingsWebhookSecretRequired,
  verifyWithingsWebhookSecret,
} from "@/lib/withings/webhook-auth";

function getSecretFromRequest(request: Request): string {
  return new URL(request.url).searchParams.get("s") ?? "";
}

export async function HEAD(request: Request) {
  const secret = getSecretFromRequest(request);
  if (isWithingsWebhookSecretRequired() && !verifyWithingsWebhookSecret(secret)) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, { status: 200 });
}

export async function POST(request: Request) {
  const secret = getSecretFromRequest(request);

  if (isWithingsWebhookSecretRequired()) {
    if (!verifyWithingsWebhookSecret(secret)) {
      logger.warn("Withings", "Webhook rejected invalid or missing secret");
      return NextResponse.json({ ok: false }, { status: 403 });
    }
  } else if (secret && !verifyWithingsWebhookSecret(secret)) {
    logger.warn("Withings", "Webhook rejected invalid secret");
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const raw = await request.text();
  return handleWithingsWebhookRequest(raw);
}
