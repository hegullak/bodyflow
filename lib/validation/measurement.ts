import { z } from "zod";

export const measurementFormSchema = z.object({
  measuredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  chestCm: z.coerce
    .number()
    .positive()
    .max(300)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  waistCm: z.coerce
    .number()
    .positive()
    .max(300)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  hipCm: z.coerce
    .number()
    .positive()
    .max(300)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  note: z.string().max(1000).optional().or(z.literal("").transform(() => undefined)),
});
