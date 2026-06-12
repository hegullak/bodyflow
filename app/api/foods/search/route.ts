import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { searchFoodProducts } from "@/lib/foods/catalog";
import { isRateLimited } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const userId = await requireUserId();

  if (isRateLimited(`search:${userId}`, 30)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? searchParams.get("q") ?? "";

  try {
    const products = await searchFoodProducts(search);
    return NextResponse.json({ data: products });
  } catch {
    return NextResponse.json({ error: "Food search failed" }, { status: 500 });
  }
}
