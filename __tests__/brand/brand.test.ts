import { describe, it, expect } from "vitest";
import {
  BODYFLOW_SLOGAN,
  BODYFLOW_COMEBACK_SLOGAN,
  BODYFLOW_SUPPORTING_PHILOSOPHY,
  BODYFLOW_PRODUCT_PRINCIPLES,
  INACTIVITY_THRESHOLD_DAYS,
  validatePrimarySloganNotTranslated,
} from "@/lib/brand";

describe("bodyflow brand constants", () => {
  it("has the correct primary slogan", () => {
    expect(BODYFLOW_SLOGAN).toBe("A little beats nothing. Every time.");
  });

  it("primary slogan is not translated", () => {
    expect(BODYFLOW_SLOGAN).toMatch(/A little beats nothing/);
    expect(BODYFLOW_SLOGAN).not.toMatch(/[åäöøæñé]/i);
  });

  it("comeback slogan matches primary slogan", () => {
    expect(BODYFLOW_COMEBACK_SLOGAN).toBe(BODYFLOW_SLOGAN);
  });

  it("has supporting philosophy lines", () => {
    expect(BODYFLOW_SUPPORTING_PHILOSOPHY).toHaveLength(3);
    expect(BODYFLOW_SUPPORTING_PHILOSOPHY[0]).toContain("Adjust");
  });

  it("has product principles", () => {
    expect(BODYFLOW_PRODUCT_PRINCIPLES.length).toBeGreaterThan(0);
  });

  it("inactivity threshold is defined", () => {
    expect(INACTIVITY_THRESHOLD_DAYS).toBe(14);
  });

  it("validatePrimarySloganNotTranslated returns true for correct slogan", () => {
    expect(validatePrimarySloganNotTranslated(BODYFLOW_SLOGAN)).toBe(true);
  });

  it("validatePrimarySloganNotTranslated returns false for translated slogan", () => {
    expect(validatePrimarySloganNotTranslated("En liten bit slår ingenting")).toBe(false);
  });
});
