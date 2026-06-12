export interface MonthlyStats {
  year: number;
  month: number;
  label: string;
  avgWeightKg: number | null;
  avgWaistCm: number | null;
  avgChestCm: number | null;
  avgHipCm: number | null;
  weightCount: number;
  measurementCount: number;
}

export interface YearlyStats {
  year: number;
  avgWeightKg: number | null;
  avgWaistCm: number | null;
  avgChestCm: number | null;
  avgHipCm: number | null;
  weightCount: number;
  measurementCount: number;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10;
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

type MonthlyBucket = MonthlyStats & {
  _weights: number[];
  _waists: number[];
  _chests: number[];
  _hips: number[];
};

function createMonthlyBucket(year: number, month: number): MonthlyBucket {
  return {
    year,
    month,
    label: monthLabel(year, month),
    avgWeightKg: null,
    avgWaistCm: null,
    avgChestCm: null,
    avgHipCm: null,
    weightCount: 0,
    measurementCount: 0,
    _weights: [],
    _waists: [],
    _chests: [],
    _hips: [],
  };
}

export function buildMonthlyStats(input: {
  weights: { date: string; value: number }[];
  measurements: {
    measuredOn: string;
    waistCm: number | null;
    chestCm: number | null;
    hipCm: number | null;
  }[];
  fromYear?: number;
}): MonthlyStats[] {
  const fromYear = input.fromYear ?? 2020;
  const buckets = new Map<string, MonthlyBucket>();

  for (const weight of input.weights) {
    const [yearStr, monthStr] = weight.date.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (year < fromYear) continue;
    const key = `${year}-${monthStr}`;
    const bucket = buckets.get(key) ?? createMonthlyBucket(year, month);
    bucket._weights.push(weight.value);
    bucket.weightCount += 1;
    buckets.set(key, bucket);
  }

  for (const m of input.measurements) {
    const [yearStr, monthStr] = m.measuredOn.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (year < fromYear) continue;
    const key = `${year}-${monthStr}`;
    const bucket = buckets.get(key) ?? createMonthlyBucket(year, month);
    if (m.waistCm != null) bucket._waists.push(m.waistCm);
    if (m.chestCm != null) bucket._chests.push(m.chestCm);
    if (m.hipCm != null) bucket._hips.push(m.hipCm);
    bucket.measurementCount += 1;
    buckets.set(key, bucket);
  }

  return [...buckets.values()]
    .map((b) => ({
      year: b.year,
      month: b.month,
      label: b.label,
      avgWeightKg: average(b._weights),
      avgWaistCm: average(b._waists),
      avgChestCm: average(b._chests),
      avgHipCm: average(b._hips),
      weightCount: b.weightCount,
      measurementCount: b.measurementCount,
    }))
    .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year));
}

export function buildYearlyStats(input: {
  weights: { date: string; value: number }[];
  measurements: {
    measuredOn: string;
    waistCm: number | null;
    chestCm: number | null;
    hipCm: number | null;
  }[];
  fromYear?: number;
}): YearlyStats[] {
  const fromYear = input.fromYear ?? 2020;
  const buckets = new Map<
    number,
    YearlyStats & { _weights: number[]; _waists: number[]; _chests: number[]; _hips: number[] }
  >();

  const getBucket = (year: number) => {
    const existing = buckets.get(year);
    if (existing) return existing;
    const created = {
      year,
      avgWeightKg: null,
      avgWaistCm: null,
      avgChestCm: null,
      avgHipCm: null,
      weightCount: 0,
      measurementCount: 0,
      _weights: [],
      _waists: [],
      _chests: [],
      _hips: [],
    };
    buckets.set(year, created);
    return created;
  };

  for (const weight of input.weights) {
    const year = Number(weight.date.slice(0, 4));
    if (year < fromYear) continue;
    const bucket = getBucket(year);
    bucket._weights.push(weight.value);
    bucket.weightCount += 1;
  }

  for (const m of input.measurements) {
    const year = Number(m.measuredOn.slice(0, 4));
    if (year < fromYear) continue;
    const bucket = getBucket(year);
    if (m.waistCm != null) bucket._waists.push(m.waistCm);
    if (m.chestCm != null) bucket._chests.push(m.chestCm);
    if (m.hipCm != null) bucket._hips.push(m.hipCm);
    bucket.measurementCount += 1;
  }

  return [...buckets.values()]
    .map((b) => ({
      year: b.year,
      avgWeightKg: average(b._weights),
      avgWaistCm: average(b._waists),
      avgChestCm: average(b._chests),
      avgHipCm: average(b._hips),
      weightCount: b.weightCount,
      measurementCount: b.measurementCount,
    }))
    .sort((a, b) => a.year - b.year);
}
