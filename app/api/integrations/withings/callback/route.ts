import { NextResponse } from "next/server";
import { exchangeAuthorizationCode } from "@/lib/withings/api";
import { isWithingsConfigured } from "@/lib/withings/config";
import { verifyWithingsOAuthState } from "@/lib/withings/oauth-state";
import { saveWithingsConnection, syncWithingsForUser } from "@/lib/withings/sync";

export async function GET(request: Request) {
  if (!isWithingsConfigured()) {
    return NextResponse.redirect(new URL("/profile?withings=not_configured", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/profile?withings=denied`, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/profile?withings=invalid", request.url));
  }

  const userId = verifyWithingsOAuthState(state);
  if (!userId) {
    return NextResponse.redirect(new URL("/profile?withings=invalid_state", request.url));
  }

  try {
    const tokens = await exchangeAuthorizationCode(code);
    await saveWithingsConnection({
      userId,
      withingsUserId: String(tokens.userid),
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
    });

    await syncWithingsForUser(userId, { force: true });
    return NextResponse.redirect(new URL("/profile?withings=connected", request.url));
  } catch {
    return NextResponse.redirect(new URL("/profile?withings=error", request.url));
  }
}
