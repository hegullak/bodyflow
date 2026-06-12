import { NextResponse } from "next/server";
import { buildAppUrl } from "@/lib/app-url";
import { exchangeAuthorizationCode } from "@/lib/withings/api";
import { isWithingsConfigured } from "@/lib/withings/config";
import { verifyWithingsOAuthState } from "@/lib/withings/oauth-state";
import { saveWithingsConnection, syncWithingsForUser } from "@/lib/withings/sync";

export async function GET(request: Request) {
  if (!isWithingsConfigured()) {
    return NextResponse.redirect(buildAppUrl(request, "/?withings=not_configured"));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(buildAppUrl(request, "/?withings=denied"));
  }

  if (!code || !state) {
    return NextResponse.redirect(buildAppUrl(request, "/?withings=invalid"));
  }

  const userId = verifyWithingsOAuthState(state);
  if (!userId) {
    return NextResponse.redirect(buildAppUrl(request, "/?withings=invalid_state"));
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
    // Land on public home first to avoid Clerk session-refresh loops on protected routes
    // immediately after the external OAuth redirect.
    return NextResponse.redirect(buildAppUrl(request, "/?withings=connected"));
  } catch {
    return NextResponse.redirect(buildAppUrl(request, "/?withings=error"));
  }
}
