import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { handleWithingsWebhookRequest } from "@/lib/withings/webhook-handler";
import { verifyWithingsWebhookSecret } from "@/lib/withings/webhook-auth";

type RouteContext = { params: Promise<{ secret: string }> };

export async function HEAD(_request: Request, context: RouteContext) {
  const { secret } = await context.params;
  if (!verifyWithingsWebhookSecret(secret)) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, { status: 200 });
}

export async function POST(request: Request, context: RouteContext) {
  const { secret } = await context.params;
  if (!verifyWithingsWebhookSecret(secret)) {
    logger.warn("Withings", "Webhook rejected invalid secret");
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const raw = await request.text();
  return handleWithingsWebhookRequest(raw);
}
