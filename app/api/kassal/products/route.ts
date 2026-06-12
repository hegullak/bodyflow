import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import {
  KassalApiError,
  KassalNotConfiguredError,
  searchKassalProducts,
} from "@/lib/kassal/client";
import { isKassalConfigured } from "@/lib/kassal/config";

export async function GET(req: Request) {
  if (!isKassalConfigured()) {
    return NextResponse.json({ error: "Kassal is not configured" }, { status: 503 });
  }

  await requireUserId();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const size = Number(searchParams.get("size") ?? "20");

  try {
    const products = await searchKassalProducts(search, Number.isFinite(size) ? size : 20);
    return NextResponse.json({ data: products });
  } catch (error) {
    if (error instanceof KassalNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof KassalApiError) {
      let detail = "Kassal lookup failed";
      try {
        const parsed = JSON.parse(error.message) as { message?: string };
        if (parsed.message) detail = parsed.message;
      } catch {
        // keep generic message
      }
      return NextResponse.json({ error: detail }, { status: error.status });
    }
    return NextResponse.json({ error: "Kassal lookup failed" }, { status: 500 });
  }
}
