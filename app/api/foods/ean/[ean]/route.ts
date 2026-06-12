import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { lookupFoodByEan } from "@/lib/foods/catalog";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ean: string }> },
) {
  await requireUserId();

  const { ean } = await params;

  try {
    const product = await lookupFoodByEan(ean);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ data: product });
  } catch {
    return NextResponse.json({ error: "Food lookup failed" }, { status: 500 });
  }
}
