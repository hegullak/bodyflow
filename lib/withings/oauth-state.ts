import { createHmac, timingSafeEqual } from "node:crypto";

function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getWithingsStateSecret(): string {
  const explicit = process.env.WITHINGS_STATE_SECRET?.trim();
  if (explicit) return explicit;

  if (isProductionEnvironment()) {
    throw new Error("WITHINGS_STATE_SECRET is required in production.");
  }

  const fallback =
    process.env.CLERK_SECRET_KEY?.trim() ??
    process.env.WITHINGS_CLIENT_SECRET?.trim() ??
    "dev-only-withings-state-secret";

  return fallback;
}

export function isWithingsOAuthStateConfigured(): boolean {
  try {
    getWithingsStateSecret();
    return true;
  } catch {
    return false;
  }
}

export function signWithingsOAuthState(userId: string): string {
  const exp = Date.now() + 10 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ userId, exp })).toString("base64url");
  const signature = createHmac("sha256", getWithingsStateSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyWithingsOAuthState(state: string): string | null {
  let secret: string;
  try {
    secret = getWithingsStateSecret();
  } catch {
    return null;
  }

  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", secret).update(payload).digest("base64url");

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
