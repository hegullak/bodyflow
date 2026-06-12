import { describe, expect, it } from "vitest";
import {
  mergeMeasurements,
  parseMeasurementFiles,
  parseMeasurementsText,
} from "@/lib/import/parse-measurements";

describe("parseMeasurementsText", () => {
  it("parses labeled W/C/H entries", () => {
    const entries = parseMeasurementsText(`
17.08.2024
W 96
C 96
H 98.5
`);
    expect(entries).toEqual([
      {
        measuredOn: "2024-08-17",
        waistCm: 96,
        chestCm: 96,
        hipCm: 98.5,
        note: undefined,
      },
    ]);
  });

  it("parses bare three-number blocks", () => {
    const entries = parseMeasurementsText(`
17.11.2023
94
95
99
`);
    expect(entries[0]).toMatchObject({
      measuredOn: "2023-11-17",
      waistCm: 94,
      chestCm: 95,
      hipCm: 99,
    });
  });

  it("fixes common date typos", () => {
    const entries = parseMeasurementsText(`
176.08.2024
W 96
C 96
H 98.5
09.91.2026
W 94
C 95
H 96
`);
    expect(entries.map((e) => e.measuredOn)).toEqual(["2024-08-17", "2026-01-09"]);
  });

  it("parses short year format", () => {
    const entries = parseMeasurementsText(`
25.10.24
W 92
C 94
H 95.5
`);
    expect(entries[0]?.measuredOn).toBe("2024-10-25");
  });
});

describe("mergeMeasurements", () => {
  it("merges overlapping dates preferring later non-null values", () => {
    const merged = mergeMeasurements([
      { measuredOn: "2024-08-17", waistCm: 96, chestCm: 96, hipCm: 98.5 },
      { measuredOn: "2024-08-17", waistCm: 97, chestCm: null, hipCm: null },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.waistCm).toBe(97);
    expect(merged[0]?.chestCm).toBe(96);
  });
});

describe("parseMeasurementFiles", () => {
  it("deduplicates across multiple sources", () => {
    const a = `17.08.2024\nW 96\nC 96\nH 98.5`;
    const b = `17.08.2024\nW 96\nC 96\nH 98.5`;
    expect(parseMeasurementFiles(a, b)).toHaveLength(1);
  });
});
