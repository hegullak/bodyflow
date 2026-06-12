"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { upsertCustomFoodProduct } from "@/lib/foods/catalog";
import { requireFoodCustomPrefixId } from "@/lib/foods/prefix";
import { type ActionResult, flattenZodErrors } from "./types";

const saveCustomFoodSchema = z.object({
  name: z.string().min(1).max(500),
  brand: z.string().max(200).optional().or(z.literal("").transform(() => undefined)),
  ean: z
    .string()
    .regex(/^\d{8,14}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  kcalPer100g: z.coerce.number().positive().max(1000),
  packageGrams: z.coerce
    .number()
    .positive()
    .max(10000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export async function saveCustomFoodAction(
  _prev: ActionResult<{ foodProductId: string; name: string; kcalPer100g: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ foodProductId: string; name: string; kcalPer100g: number }>> {
  try {
    requireFoodCustomPrefixId();
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Custom prefix is not configured.",
    };
  }

  const parsed = saveCustomFoodSchema.safeParse({
    name: formData.get("name"),
    brand: formData.get("brand") ?? "",
    ean: formData.get("ean") ?? "",
    kcalPer100g: formData.get("kcalPer100g"),
    packageGrams: formData.get("packageGrams") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  try {
    const food = await upsertCustomFoodProduct(parsed.data);
    revalidatePath("/meals");
    return {
      ok: true,
      data: {
        foodProductId: food.id,
        name: food.name,
        kcalPer100g: food.kcalPer100g,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save custom food.",
    };
  }
}
