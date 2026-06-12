export interface WithingsRawMeasure {
  value: number;
  type: number;
  unit: number;
}

export interface WithingsMeasureGroup {
  grpid: number;
  date: number;
  measures: WithingsRawMeasure[];
}

export function decodeWithingsValue(value: number, unit: number): number {
  return value * 10 ** unit;
}

export function decodeWeightKg(measures: WithingsRawMeasure[]): number | null {
  const weight = measures.find((measure) => measure.type === 1);
  if (!weight) return null;
  const kg = decodeWithingsValue(weight.value, weight.unit);
  return Number.isFinite(kg) && kg > 0 ? Math.round(kg * 10) / 10 : null;
}

export function unixToIsoDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}
