import { describe, it, expect } from "vitest";
import {
  BODYFLOW_SLOGAN,
  BODYFLOW_PHILOSOPHY,
  BODYFLOW_PRODUCT_PRINCIPLES,
  BODYFLOW_GOOD_MESSAGES,
  BODYFLOW_MESSAGES_TO_AVOID,
  isPrimarySloganValid,
  selectAppropriateMessage,
  getPhilosophyGuidance,
  validatePrincipleAlignment,
} from "./bodyflowBrand";

describe("bodyflowBrand", () => {
  describe("constants", () => {
    it("has primary slogan", () => {
      expect(BODYFLOW_SLOGAN).toBe("A little beats nothing. Every time.");
    });

    it("has philosophy principles", () => {
      expect(BODYFLOW_PHILOSOPHY).toHaveLength(3);
      expect(BODYFLOW_PHILOSOPHY).toContain("Adjust, don't reinvent.");
    });

    it("has product principles", () => {
      expect(BODYFLOW_PRODUCT_PRINCIPLES).toHaveLength(4);
      expect(BODYFLOW_PRODUCT_PRINCIPLES[0]).toBe("Warm and honest");
    });

    it("has good messages", () => {
      expect(BODYFLOW_GOOD_MESSAGES.length).toBeGreaterThan(0);
    });

    it("has messages to avoid", () => {
      expect(BODYFLOW_MESSAGES_TO_AVOID.length).toBeGreaterThan(0);
    });
  });

  describe("isPrimarySloganValid", () => {
    it("validates correct slogan", () => {
      expect(isPrimarySloganValid("A little beats nothing. Every time.")).toBe(true);
    });

    it("rejects different text", () => {
      expect(isPrimarySloganValid("Transform your life")).toBe(false);
    });

    it("is case sensitive", () => {
      expect(isPrimarySloganValid("a little beats nothing. every time.")).toBe(false);
    });
  });

  describe("selectAppropriateMessage", () => {
    it("returns good message from good context", () => {
      const msg = selectAppropriateMessage("good");
      expect(BODYFLOW_GOOD_MESSAGES).toContain(msg);
    });

    it("returns avoid message from avoid context", () => {
      const msg = selectAppropriateMessage("avoid");
      expect(BODYFLOW_MESSAGES_TO_AVOID).toContain(msg);
    });

    it("returns consistent type", () => {
      const msg = selectAppropriateMessage("good");
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
    });
  });

  describe("getPhilosophyGuidance", () => {
    it("returns philosophy from list", () => {
      const guidance = getPhilosophyGuidance();
      expect(BODYFLOW_PHILOSOPHY).toContain(guidance);
    });

    it("always returns a valid philosophy", () => {
      for (let i = 0; i < 10; i++) {
        const guidance = getPhilosophyGuidance();
        expect(guidance).toBeTruthy();
        expect(typeof guidance).toBe("string");
      }
    });
  });

  describe("validatePrincipleAlignment", () => {
    it("accepts messages not in avoid list", () => {
      const msg = "Start with one small thing";
      expect(validatePrincipleAlignment(msg, "Warm and honest")).toBe(true);
    });

    it("rejects messages in avoid list", () => {
      const msg = "You failed.";
      expect(validatePrincipleAlignment(msg, "Non-shaming and supportive")).toBe(false);
    });

    it("rejects bad messages", () => {
      const badMsg = "You failed.";
      expect(validatePrincipleAlignment(badMsg, "Warm and honest")).toBe(false);
    });

    it("accepts good messages", () => {
      const goodMsg = "Start with one small thing.";
      expect(validatePrincipleAlignment(goodMsg, "Practical and direct")).toBe(true);
    });
  });
});
