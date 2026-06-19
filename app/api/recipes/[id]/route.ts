import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { deleteRecipe, getRecipeDetail, updateRecipe } from "@/lib/recipes";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id } = await params;
  const recipe = await getRecipeDetail(id, userId);
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(recipe);
}

export async function PATCH(req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: { name?: string; cookedWeightG?: number | null } = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if ("cookedWeightG" in body) patch.cookedWeightG = body.cookedWeightG ?? null;
  const recipe = await updateRecipe(id, userId, patch);
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(recipe);
}

export async function DELETE(_req: Request, { params }: Params) {
  const userId = await requireUserId();
  const { id } = await params;
  const ok = await deleteRecipe(id, userId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
