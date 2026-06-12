import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { lookupFoodByEan } from "@/lib/foods/catalog";
import { getFoodCustomPrefixId } from "@/lib/foods/prefix";
import { extractFoodLabelFromImage } from "@/lib/foods/vision-extract";
import { logger } from "@/lib/logger";
import { isRateLimited } from "@/lib/rate-limit";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const EXTRACT_RATE_LIMIT = 5;

async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/jpeg";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export async function POST(req: Request) {
  const userId = await requireUserId();

  if (isRateLimited(`extract:${userId}`, EXTRACT_RATE_LIMIT)) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  if (!getFoodCustomPrefixId()) {
    return NextResponse.json(
      { error: "FOOD_CUSTOM_PREFIX_ID is not configured." },
      { status: 503 },
    );
  }

  const formData = await req.formData();
  const nutritionImage = formData.get("nutritionImage");
  const eanHint = String(formData.get("ean") ?? "").replace(/\D/g, "") || null;
  const ocrText = String(formData.get("ocrText") ?? "").trim() || undefined;

  if (!(nutritionImage instanceof File)) {
    return NextResponse.json({ error: "nutritionImage is required." }, { status: 400 });
  }

  if (nutritionImage.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 10 MB)." }, { status: 413 });
  }

  if (eanHint) {
    const existing = await lookupFoodByEan(eanHint);
    if (existing) {
      return NextResponse.json({
        data: {
          existing: true,
          product: existing,
          prefixId: getFoodCustomPrefixId(),
        },
      });
    }
  }

  try {
    const nutritionImageBase64 = await fileToDataUrl(nutritionImage);
    const extracted = await extractFoodLabelFromImage({
      nutritionImageBase64,
      ocrText,
      eanHint,
    });

    return NextResponse.json({
      data: {
        existing: false,
        extraction: extracted,
        prefixId: getFoodCustomPrefixId(),
      },
    });
  } catch (error) {
    logger.error("FoodExtract", "Label extraction failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Could not extract label data.", prefixId: getFoodCustomPrefixId() },
      { status: 422 },
    );
  }
}
