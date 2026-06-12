import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { searchFoodProducts } from "@/lib/foods/catalog";

export async function GET(req: Request) {
  await requireUserId();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? searchParams.get("q") ?? "";

  try {
    const products = await searchFoodProducts(search);
    return NextResponse.json({ data: products });
  } catch {
    return NextResponse.json({ error: "Food search failed" }, { status: 500 });
  }
}
