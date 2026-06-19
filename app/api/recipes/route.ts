import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { createRecipe, listRecipes } from "@/lib/recipes";

export async function GET() {
  const userId = await requireUserId();
  const data = await listRecipes(userId);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  const { name } = await req.json().catch(() => ({}));
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  const recipe = await createRecipe(userId, name.trim());
  return NextResponse.json(recipe, { status: 201 });
}
