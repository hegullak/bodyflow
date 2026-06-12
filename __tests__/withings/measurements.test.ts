import { describe, expect, it } from "vitest";
import {
  decodeWeightKg,
  decodeWithingsValue,
  unixToIsoDate,
} from "@/lib/withings/measurements";

describe("decodeWithingsValue", () => {
  it("decodes weight from Withings unit exponent", () => {
    expect(decodeWithingsValue(7500, -2)).toBe(75);
  });
});

describe("decodeWeightKg", () => {
  it("extracts weight measurement type 1", () => {
    expect(
      decodeWeightKg([
        { type: 1, value: 7840, unit: -2 },
        { type: 6, value: 2200, unit: -2 },
      ]),
    ).toBe(78.4);
  });
});

describe("unixToIsoDate", () => {
  it("converts unix seconds to YYYY-MM-DD", () => {
    expect(unixToIsoDate(1728000000)).toBe("2024-10-04");
  });
});
