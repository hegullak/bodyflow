import { z } from "zod";

export const dailyLogFormSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.coerce
    .number()
    .positive()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  calorieIntake: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().int().min(0).max(20000).optional(),
  ),
  note: z.string().max(1000).optional().or(z.literal("").transform(() => undefined)),
});

export type DailyLogFormInput = z.infer<typeof dailyLogFormSchema>;
