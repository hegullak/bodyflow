import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { lookupFoodByEanWithSources } from "@/lib/foods/catalog";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ean: string }> },
) {
  await requireUserId();

  const { ean } = await params;

  try {
    const result = await lookupFoodByEanWithSources(ean);
    if (!result.product) {
      return NextResponse.json(
        { error: "Product not found", sources: result.sourcesTried },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: result.product });
  } catch {
    return NextResponse.json({ error: "Food lookup failed" }, { status: 500 });
  }
}
