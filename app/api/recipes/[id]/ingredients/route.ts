import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { addIngredient } from "@/lib/recipes";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { foodProductId, productName, kcalPer100g, quantityGrams } = body;
  if (!productName?.trim() || typeof kcalPer100g !== "number" || typeof quantityGrams !== "number") {
    return NextResponse.json({ error: "productName, kcalPer100g, quantityGrams required" }, { status: 400 });
  }
  const recipe = await addIngredient(id, userId, {
    foodProductId: foodProductId ?? null,
    productName: productName.trim(),
    kcalPer100g,
    quantityGrams,
  });
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(recipe);
}
