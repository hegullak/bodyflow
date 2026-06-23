export type Unit = "g" | "dl" | "flaske" | "boks";

export const UNIT_FACTOR: Record<Unit, number> = { g: 1, dl: 100, flaske: 333, boks: 500 };
export const UNIT_LABEL: Record<Unit, string> = { g: "g", dl: "dl", flaske: "flaske", boks: "boks" };
export const UNITS: Unit[] = ["g", "dl", "flaske", "boks"];

export function toGrams(qty: number, unit: Unit): number {
  return Math.round(qty * UNIT_FACTOR[unit]);
}

export function convertUnit(qty: number, from: Unit, to: Unit): number {
  return parseFloat(((qty * UNIT_FACTOR[from]) / UNIT_FACTOR[to]).toFixed(2));
}
