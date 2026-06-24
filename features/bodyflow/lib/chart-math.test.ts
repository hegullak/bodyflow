import { describe, expect, it } from "vitest";
import {
  latestValue,
  normalizeSeries,
  seriesDelta,
  seriesMax,
  seriesMin,
  toPointSegments,
} from "./chart-math";

describe("seriesMax / seriesMin", () => {
  it("ignores nulls", () => {
    expect(seriesMax([null, 3, null, 7, 2])).toBe(7);
    expect(seriesMin([null, 3, null, 7, 2])).toBe(2);
  });

  it("returns 0 max and null min for an all-null series", () => {
    expect(seriesMax([null, null])).toBe(0);
    expect(seriesMin([null, null])).toBeNull();
  });
});

describe("normalizeSeries", () => {
  it("maps min to 0 and max to 1", () => {
    expect(normalizeSeries([10, 20, 30])).toEqual([0, 0.5, 1]);
  });

  it("preserves nulls as gaps", () => {
    expect(normalizeSeries([10, null, 30])).toEqual([0, null, 1]);
  });

  it("centres a flat series at 0.5 instead of collapsing to 0", () => {
    expect(normalizeSeries([80, 80, 80])).toEqual([0.5, 0.5, 0.5]);
  });

  it("returns all-null for an empty/all-null series", () => {
    expect(normalizeSeries([null, null])).toEqual([null, null]);
  });
});

describe("seriesDelta", () => {
  it("computes first/last/delta from non-null points", () => {
    expect(seriesDelta([null, 80, 79, null, 78])).toEqual({ first: 80, last: 78, delta: -2 });
  });

  it("returns null when fewer than two points", () => {
    expect(seriesDelta([null, 80, null])).toBeNull();
    expect(seriesDelta([])).toBeNull();
  });
});

describe("latestValue", () => {
  it("returns the last non-null value", () => {
    expect(latestValue([1, 2, null])).toBe(2);
    expect(latestValue([null, null])).toBeNull();
  });
});

describe("toPointSegments", () => {
  it("splits runs across null gaps", () => {
    const segs = toPointSegments([0, 1, null, 0.5], 300, 100, 0);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toHaveLength(2);
    expect(segs[1]).toHaveLength(1);
  });

  it("inverts y so 1 maps to the top (padY) and 0 to the bottom", () => {
    const segs = toPointSegments([1, 0], 300, 100, 10);
    expect(segs[0][0].y).toBeCloseTo(10); // value 1 → top
    expect(segs[0][1].y).toBeCloseTo(90); // value 0 → bottom (height - padY)
  });

  it("centres a single point horizontally", () => {
    const segs = toPointSegments([0.5], 300, 100, 0);
    expect(segs[0][0].x).toBe(150);
  });
});
