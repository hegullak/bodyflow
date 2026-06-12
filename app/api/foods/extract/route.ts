import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/current-user";
import { lookupFoodByEan } from "@/lib/foods/catalog";
import { getFoodCustomPrefixId } from "@/lib/foods/prefix";
import { extractFoodLabelFromImage } from "@/lib/foods/vision-extract";

async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/jpeg";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export async function POST(req: Request) {
  await requireUserId();

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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Extraction failed.",
        prefixId: getFoodCustomPrefixId(),
      },
      { status: 422 },
    );
  }
}
