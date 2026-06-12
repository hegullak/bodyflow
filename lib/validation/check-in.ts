import { z } from "zod";

const optionalPositive = (max: number) =>
  z.coerce
    .number()
    .positive()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

export const checkInFormSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: optionalPositive(500),
  waistCm: optionalPositive(300),
  chestCm: optionalPositive(300),
  hipCm: optionalPositive(300),
});
