import { timingSafeEqual } from "node:crypto";

export function isWithingsWebhookSecretRequired(): boolean {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";
  return !base.includes("localhost") && !base.includes("127.0.0.1");
}

export function getWithingsWebhookSecret(): string | null {
  const secret = process.env.WITHINGS_WEBHOOK_SECRET?.trim();
  return secret || null;
}

export function requireWithingsWebhookSecret(): string {
  const secret = getWithingsWebhookSecret();
  if (!secret) {
    throw new Error("WITHINGS_WEBHOOK_SECRET is not set.");
  }
  return secret;
}

export function verifyWithingsWebhookSecret(provided: string): boolean {
  let expected: string;
  try {
    expected = requireWithingsWebhookSecret();
  } catch {
    return false;
  }

  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}
