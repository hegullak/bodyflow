import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import {
  findKassalProductByEan,
  KassalApiError,
  KassalNotConfiguredError,
} from "@/lib/kassal/client";
import { isKassalConfigured } from "@/lib/kassal/config";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ean: string }> },
) {
  if (!isKassalConfigured()) {
    return NextResponse.json({ error: "Kassal is not configured" }, { status: 503 });
  }

  await requireUserId();

  const { ean } = await params;

  try {
    const product = await findKassalProductByEan(ean);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ data: product });
  } catch (error) {
    if (error instanceof KassalNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof KassalApiError) {
      return NextResponse.json({ error: "Kassal lookup failed" }, { status: error.status });
    }
    return NextResponse.json({ error: "Kassal lookup failed" }, { status: 500 });
  }
}
