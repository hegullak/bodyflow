const WEEKDAY_SHORT_TO_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export type ReminderScheduleInput = {
  weekdays: number[];
  reminderTime: string;
  timezone: string;
};

export function parseReminderTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: WEEKDAY_SHORT_TO_INDEX[parts.weekday] ?? 0,
  };
}

export function makeDateInTimeZone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i++) {
    const parts = getDatePartsInTimeZone(new Date(utc), timeZone);
    const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
    const actual = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
    utc += desired - actual;
  }
  return new Date(utc);
}

function addDaysYmd(year: number, month: number, day: number, offset: number) {
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function getUpcomingReminderTimes(
  config: ReminderScheduleInput,
  from: Date,
  count: number,
  horizonDays = 14,
): Date[] {
  const parsed = parseReminderTime(config.reminderTime);
  if (!parsed || config.weekdays.length === 0) return [];

  const weekdaySet = new Set(config.weekdays);
  const results: Date[] = [];
  const startParts = getDatePartsInTimeZone(from, config.timezone);

  for (let offset = 0; offset < horizonDays && results.length < count; offset++) {
    const ymd = addDaysYmd(startParts.year, startParts.month, startParts.day, offset);
    const probe = makeDateInTimeZone(
      ymd.year,
      ymd.month,
      ymd.day,
      12,
      0,
      config.timezone,
    );
    const weekday = getDatePartsInTimeZone(probe, config.timezone).weekday;
    if (!weekdaySet.has(weekday)) continue;

    const fireAt = makeDateInTimeZone(
      ymd.year,
      ymd.month,
      ymd.day,
      parsed.hour,
      parsed.minute,
      config.timezone,
    );
    if (fireAt > from) results.push(fireAt);
  }

  return results.sort((a, b) => a.getTime() - b.getTime()).slice(0, count);
}
