import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { getFoodCatalogConfig } from "@/lib/foods/catalog";

export async function GET() {
  await requireUserId();
  return NextResponse.json({ data: getFoodCatalogConfig() });
}
