import { z } from "zod";

export const profileFormSchema = z.object({
  sex: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  birthYear: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().int().min(1900).max(new Date().getFullYear()).optional(),
  ),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  heightCm: z.coerce.number().positive().max(300),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goal: z.enum(["fat_loss", "maintenance", "muscle_gain"]),
  targetWeightKg: z.coerce
    .number()
    .positive()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  dailyCalorieTarget: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().int().min(500).max(10000).optional(),
  ),
  preferredUnits: z.enum(["metric", "imperial"]),
});

export type ProfileFormInput = z.infer<typeof profileFormSchema>;
