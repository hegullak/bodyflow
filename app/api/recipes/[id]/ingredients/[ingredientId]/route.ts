import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { removeIngredient, updateIngredientQty } from "@/lib/recipes";

type Params = { params: Promise<{ id: string; ingredientId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id, ingredientId } = await params;
  const { quantityGrams } = await req.json().catch(() => ({}));
  if (typeof quantityGrams !== "number" || quantityGrams <= 0) {
    return NextResponse.json({ error: "quantityGrams required" }, { status: 400 });
  }
  const recipe = await updateIngredientQty(ingredientId, id, userId, quantityGrams);
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(recipe);
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id, ingredientId } = await params;
  const recipe = await removeIngredient(ingredientId, id, userId);
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(recipe);
}
