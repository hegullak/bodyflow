import { NextResponse } from "next/server";
import { getWithingsCallbackUrl } from "@/lib/app-url";
import { requireUserId } from "@/lib/auth/current-user";
import { buildAuthorizeUrl } from "@/lib/withings/api";
import { isWithingsConfigured } from "@/lib/withings/config";
import { signWithingsOAuthState } from "@/lib/withings/oauth-state";

export async function GET(request: Request) {
  if (!isWithingsConfigured()) {
    return NextResponse.json({ error: "Withings is not configured" }, { status: 503 });
  }

  const userId = await requireUserId();
  const state = signWithingsOAuthState(userId);
  const redirectUri = getWithingsCallbackUrl(request);
  const url = buildAuthorizeUrl(state, redirectUri);
  return NextResponse.redirect(url);
}
