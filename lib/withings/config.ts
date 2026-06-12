const WITHINGS_API_BASE = "https://wbsapi.withings.net";
const WITHINGS_OAUTH_AUTHORIZE =
  "https://account.withings.com/oauth2_user/authorize2";

export function getWithingsConfig() {
  const clientId = process.env.WITHINGS_CLIENT_ID;
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET;
  const redirectUri =
    process.env.WITHINGS_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010"}/api/integrations/withings/callback`;

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    apiBase: WITHINGS_API_BASE,
    authorizeUrl: WITHINGS_OAUTH_AUTHORIZE,
    scopes: "user.info,user.metrics",
    oauthMode: process.env.WITHINGS_OAUTH_MODE,
  };
}

export function isWithingsTokenEncryptionConfigured(): boolean {
  return Boolean(process.env.WITHINGS_TOKEN_ENCRYPTION_KEY?.trim());
}

export function isWithingsConfigured(): boolean {
  return getWithingsConfig() !== null && isWithingsTokenEncryptionConfigured();
}

export function getWithingsWebhookUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";
  return `${base}/api/integrations/withings/webhook`;
}

export const WITHINGS_SYNC_INTERVAL_MS = 10 * 60 * 1000;
export const WITHINGS_INITIAL_LOOKBACK_SECONDS = 90 * 24 * 60 * 60;
export const WITHINGS_WEIGHT_TYPE = 1;
