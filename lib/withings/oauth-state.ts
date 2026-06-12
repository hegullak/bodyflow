import { createHmac, timingSafeEqual } from "node:crypto";

function getStateSecret(): string {
  return (
    process.env.WITHINGS_STATE_SECRET ??
    process.env.CLERK_SECRET_KEY ??
    process.env.WITHINGS_CLIENT_SECRET ??
    "dev-only-withings-state-secret"
  );
}

export function signWithingsOAuthState(userId: string): string {
  const exp = Date.now() + 10 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ userId, exp })).toString("base64url");
  const signature = createHmac("sha256", getStateSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyWithingsOAuthState(state: string): string | null {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", getStateSecret())
    .update(payload)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId?: string;
      exp?: number;
    };
    if (!parsed.userId || !parsed.exp || parsed.exp < Date.now()) return null;
    return parsed.userId;
  } catch {
    return null;
  }
}
