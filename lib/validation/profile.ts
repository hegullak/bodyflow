import { z } from "zod";

export const profileFormSchema = z.object({
  sex: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  age: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().int().min(1).max(120).optional(),
  ),
  heightCm: z.coerce.number().positive().max(300),
  weightKg: z.coerce.number().positive().max(500).optional().or(z.literal("").transform(() => undefined)),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  targetWeightKg: z.coerce
    .number()
    .positive()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  preferredUnits: z.enum(["metric", "imperial"]),
  // preserved silently
  goal: z.enum(["fat_loss", "maintenance", "muscle_gain"]).default("maintenance"),
  dailyCalorieTarget: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().int().min(500).max(10000).optional(),
  ),
  birthYear: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().int().min(1900).max(new Date().getFullYear()).optional(),
  ),
});

export type ProfileFormInput = z.infer<typeof profileFormSchema>;
