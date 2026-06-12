export interface ParsedMeasurement {
  measuredOn: string;
  waistCm: number | null;
  chestCm: number | null;
  hipCm: number | null;
  note?: string;
}

const DATE_LINE =
  /^(\d{1,3})\s*\.\s*(\d{1,2})\s*\.+\s*(\d{2,4})\s*$/;

function normalizeDay(dayRaw: string): number | null {
  const day = Number(dayRaw);
  if (day > 31 && day < 200) {
    // e.g. 176.08.2024 → 17.08.2024
    const fixed = Number(dayRaw.slice(0, 2));
    return fixed >= 1 && fixed <= 31 ? fixed : null;
  }
  return day >= 1 && day <= 31 ? day : null;
}

function normalizeMonth(monthRaw: string): number | null {
  const month = Number(monthRaw);
  if (month >= 1 && month <= 12) return month;
  // typos: 91 → 01, 95 → 05
  if (month === 91) return 1;
  if (month === 95) return 5;
  return null;
}

function normalizeYear(yearRaw: string, month: number, day: number): string | null {
  let year = Number(yearRaw);
  if (yearRaw.length === 2) {
    year = year < 50 ? 2000 + year : 1900 + year;
  }
  if (year < 2020 || year > 2030) return null;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function parseMeasurementValue(raw: string): number | null {
  const cleaned = raw.replace(",", ".").trim();
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0 || value > 300) return null;
  return Math.round(value * 10) / 10;
}

function parseLabeledLine(line: string): { kind: "w" | "c" | "h"; value: number } | null {
  const match = line.match(/^([WCHG])\s*:?\s*([\d.,]+)/i);
  if (!match) return null;
  const value = parseMeasurementValue(match[2]);
  if (value == null) return null;
  const letter = match[1].toUpperCase();
  if (letter === "W") return { kind: "w", value };
  if (letter === "C") return { kind: "c", value };
  return { kind: "h", value };
}

function isBareNumberLine(line: string): number | null {
  const match = line.match(/^([\d.,]+)\s*(?:cm|totalt.*)?$/i);
  if (!match) return null;
  return parseMeasurementValue(match[1]);
}

function flushEntry(
  entry: Partial<ParsedMeasurement> & { measuredOn?: string },
  results: ParsedMeasurement[],
) {
  if (!entry.measuredOn) return;
  if (entry.waistCm == null && entry.chestCm == null && entry.hipCm == null) return;
  results.push({
    measuredOn: entry.measuredOn,
    waistCm: entry.waistCm ?? null,
    chestCm: entry.chestCm ?? null,
    hipCm: entry.hipCm ?? null,
    note: entry.note,
  });
}

export function parseMeasurementsText(text: string): ParsedMeasurement[] {
  const results: ParsedMeasurement[] = [];
  let current: Partial<ParsedMeasurement> & { measuredOn?: string } = {};
  let pendingBare: number[] = [];

  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || /^body measurements|^mål$/i.test(line)) continue;

    const dateMatch = line.match(DATE_LINE);
    if (dateMatch) {
      flushEntry(current, results);
      current = {};
      pendingBare = [];

      const day = normalizeDay(dateMatch[1]);
      const month = normalizeMonth(dateMatch[2]);
      if (day == null || month == null) continue;

      const measuredOn = normalizeYear(dateMatch[3], month, day);
      if (!measuredOn) continue;
      current.measuredOn = measuredOn;
      continue;
    }

    if (!current.measuredOn) continue;

    const labeled = parseLabeledLine(line);
    if (labeled) {
      pendingBare = [];
      if (labeled.kind === "w") current.waistCm = labeled.value;
      if (labeled.kind === "c") current.chestCm = labeled.value;
      if (labeled.kind === "h") current.hipCm = labeled.value;
      if (/totalt|burned|gjsnitt/i.test(line)) {
        current.note = line;
      }
      continue;
    }

    const bare = isBareNumberLine(line);
    if (bare != null && !line.match(/^[WCH]/i)) {
      pendingBare.push(bare);
      if (pendingBare.length === 3) {
        current.waistCm = pendingBare[0];
        current.chestCm = pendingBare[1];
        current.hipCm = pendingBare[2];
        pendingBare = [];
      }
      continue;
    }

    if (/totalt|burned|gjsnitt|cm/i.test(line)) {
      current.note = current.note ? `${current.note}; ${line}` : line;
    }
  }

  flushEntry(current, results);
  return results;
}

export function mergeMeasurements(entries: ParsedMeasurement[]): ParsedMeasurement[] {
  const byDate = new Map<string, ParsedMeasurement>();

  for (const entry of entries) {
    const existing = byDate.get(entry.measuredOn);
    if (!existing) {
      byDate.set(entry.measuredOn, { ...entry });
      continue;
    }
    byDate.set(entry.measuredOn, {
      measuredOn: entry.measuredOn,
      waistCm: entry.waistCm ?? existing.waistCm,
      chestCm: entry.chestCm ?? existing.chestCm,
      hipCm: entry.hipCm ?? existing.hipCm,
      note: [existing.note, entry.note].filter(Boolean).join("; ") || undefined,
    });
  }

  return [...byDate.values()].sort((a, b) => a.measuredOn.localeCompare(b.measuredOn));
}

export function parseMeasurementFiles(...texts: string[]): ParsedMeasurement[] {
  const all = texts.flatMap((text) => parseMeasurementsText(text));
  return mergeMeasurements(all);
}
