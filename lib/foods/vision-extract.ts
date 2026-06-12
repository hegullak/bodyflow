import { parseNutritionLabelText, type ParsedNutritionLabel } from "./parse-nutrition-label";

export type ExtractionMethod = "vision" | "ocr";

export type FoodLabelExtraction = ParsedNutritionLabel & {
  method: ExtractionMethod;
  rawText?: string;
};

function isVisionConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

async function extractWithVision(
  nutritionImageBase64: string,
  eanHint?: string | null,
): Promise<FoodLabelExtraction> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini",
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "food_label",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: ["string", "null"] },
              brand: { type: ["string", "null"] },
              ean: { type: ["string", "null"] },
              kcalPer100g: { type: ["number", "null"] },
              packageGrams: { type: ["number", "null"] },
            },
            required: ["name", "brand", "ean", "kcalPer100g", "packageGrams"],
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            "Extract packaged food data from a nutrition label photo. Return kcal per 100g (not kJ). EAN if visible. Norwegian and English labels.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract product name, brand, EAN barcode, kcal per 100g, and package weight in grams.${eanHint ? ` Known EAN from barcode photo: ${eanHint}.` : ""}`,
            },
            {
              type: "image_url",
              image_url: {
                url: nutritionImageBase64.startsWith("data:")
                  ? nutritionImageBase64
                  : `data:image/jpeg;base64,${nutritionImageBase64}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Vision extraction failed: ${body || res.status}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Vision extraction returned empty content.");

  const parsed = JSON.parse(content) as ParsedNutritionLabel;
  return {
    ...parsed,
    ean: parsed.ean?.replace(/\D/g, "") || eanHint?.replace(/\D/g, "") || null,
    method: "vision",
  };
}

export async function extractFoodLabelFromImage(input: {
  nutritionImageBase64: string;
  ocrText?: string;
  eanHint?: string | null;
}): Promise<FoodLabelExtraction> {
  if (isVisionConfigured()) {
    try {
      return await extractWithVision(input.nutritionImageBase64, input.eanHint);
    } catch {
      // fall through to OCR text parsing
    }
  }

  if (input.ocrText?.trim()) {
    return {
      ...parseNutritionLabelText(input.ocrText, input.eanHint),
      method: "ocr",
      rawText: input.ocrText,
    };
  }

  throw new Error("Could not extract label data. Enable OPENAI_API_KEY or use OCR.");
}

export function isFoodVisionConfigured(): boolean {
  return isVisionConfigured();
}
