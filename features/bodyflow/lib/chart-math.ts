/** Pure chart-geometry helpers shared by the Bodyflow flow charts. */

export type Maybe = number | null;

/** Largest value in a series, ignoring nulls. Returns 0 for an empty series. */
export function seriesMax(values: Maybe[]): number {
  let max = 0;
  for (const v of values) {
    if (v != null && v > max) max = v;
  }
  return max;
}

/** Smallest non-null value, or null when the series has no data. */
export function seriesMin(values: Maybe[]): number | null {
  let min: number | null = null;
  for (const v of values) {
    if (v != null && (min == null || v < min)) min = v;
  }
  return min;
}

/**
 * Normalises a series to [0, 1] against its own min/max so trend direction is
 * visible regardless of unit. Nulls are preserved (gaps). A flat series maps to
 * 0.5 so it renders as a centred line rather than collapsing to the floor.
 */
export function normalizeSeries(values: Maybe[]): Maybe[] {
  const min = seriesMin(values);
  const max = seriesMax(values);
  if (min == null) return values.map(() => null);
  const span = max - min;
  return values.map((v) => {
    if (v == null) return null;
    if (span === 0) return 0.5;
    return (v - min) / span;
  });
}

/** First and last non-null values, plus their signed delta. Null when <2 points. */
export function seriesDelta(values: Maybe[]): { first: number; last: number; delta: number } | null {
  const present = values.filter((v): v is number => v != null);
  if (present.length < 2) return null;
  const first = present[0];
  const last = present[present.length - 1];
  return { first, last, delta: last - first };
}

/** Latest non-null value in a series, or null. */
export function latestValue(values: Maybe[]): number | null {
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] != null) return values[i];
  }
  return null;
}

/**
 * Maps a normalised [0,1] series to SVG polyline points within a box, dropping
 * gaps. y is inverted (1 → top). Returns an array of point segments; each
 * segment is a run of consecutive non-null points so callers can draw separate
 * polylines across gaps.
 */
export function toPointSegments(
  normalized: Maybe[],
  width: number,
  height: number,
  padY = 6,
): { x: number; y: number }[][] {
  const n = normalized.length;
  if (n === 0) return [];
  const innerH = height - padY * 2;
  const stepX = n === 1 ? 0 : width / (n - 1);
  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  normalized.forEach((v, i) => {
    if (v == null) {
      if (current.length > 0) segments.push(current);
      current = [];
      return;
    }
    const x = n === 1 ? width / 2 : stepX * i;
    const y = padY + (1 - v) * innerH;
    current.push({ x, y });
  });
  if (current.length > 0) segments.push(current);
  return segments;
}
