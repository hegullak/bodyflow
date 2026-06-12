import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { buildAuthorizeUrl } from "@/lib/withings/api";
import { isWithingsConfigured } from "@/lib/withings/config";
import { signWithingsOAuthState } from "@/lib/withings/oauth-state";

export async function GET() {
  if (!isWithingsConfigured()) {
    return NextResponse.json({ error: "Withings is not configured" }, { status: 503 });
  }

  const userId = await requireUserId();
  const state = signWithingsOAuthState(userId);
  const url = buildAuthorizeUrl(state);
  return NextResponse.redirect(url);
}
