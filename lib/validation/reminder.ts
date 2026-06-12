import { z } from "zod";

export const reminderTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const upsertReminderSchema = z.object({
  reminderType: z.enum(["weigh_in"]),
  enabled: z.coerce.boolean(),
  weekdays: z
    .array(z.coerce.number().int().min(0).max(6))
    .min(1, "Select at least one weekday"),
  reminderTime: reminderTimeSchema,
  timezone: z.string().min(1).max(100),
});

export type UpsertReminderInput = z.infer<typeof upsertReminderSchema>;
