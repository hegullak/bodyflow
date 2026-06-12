import { NextResponse } from "next/server";
import { buildAppUrl, getWithingsCallbackUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import { exchangeAuthorizationCode } from "@/lib/withings/api";
import { isWithingsConfigured } from "@/lib/withings/config";
import { verifyWithingsOAuthState } from "@/lib/withings/oauth-state";
import { saveWithingsConnection, scheduleWithingsSync } from "@/lib/withings/sync";

function profileRedirect(request: Request, withingsStatus: string) {
  return NextResponse.redirect(
    buildAppUrl(request, `/profile?withings=${withingsStatus}`),
    303,
  );
}

export async function GET(request: Request) {
  if (!isWithingsConfigured()) {
    return profileRedirect(request, "not_configured");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return profileRedirect(request, "denied");
  }

  if (!code || !state) {
    return profileRedirect(request, "invalid");
  }

  const userId = verifyWithingsOAuthState(state);
  if (!userId) {
    return profileRedirect(request, "invalid_state");
  }

  try {
    const redirectUri = getWithingsCallbackUrl(request);
    const tokens = await exchangeAuthorizationCode(code, redirectUri);
    await saveWithingsConnection({
      userId,
      withingsUserId: String(tokens.userid),
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
    });

    scheduleWithingsSync(userId);
    logger.info("Withings", "OAuth callback completed", { userId });
    return profileRedirect(request, "connected");
  } catch (callbackError) {
    logger.error("Withings", "OAuth callback failed", {
      userId,
      reason: callbackError instanceof Error ? callbackError.message : "unknown",
    });
    return profileRedirect(request, "error");
  }
}
