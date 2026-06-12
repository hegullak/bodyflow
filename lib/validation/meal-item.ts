import { z } from "zod";

export const mealTypeSchema = z.enum([
  "breakfast",
  "lunch",
  "snack",
  "dinner",
  "evening",
  "smoke",
]);

export const addMealItemSchema = z
  .object({
    logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    mealType: mealTypeSchema,
    foodProductId: z
      .string()
      .uuid()
      .optional()
      .or(z.literal("").transform(() => undefined)),
    source: z
      .enum(["kassal", "matvaretabellen", "custom"])
      .optional()
      .or(z.literal("").transform(() => undefined)),
    externalId: z
      .string()
      .max(100)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    ean: z
      .string()
      .regex(/^\d{8,14}$/)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    quantityGrams: z.coerce.number().positive().max(10000),
  })
  .refine(
    (data) => Boolean(data.foodProductId || data.ean || (data.source && data.externalId)),
    { message: "Missing product reference", path: ["foodProductId"] },
  );

export type AddMealItemInput = z.infer<typeof addMealItemSchema>;
