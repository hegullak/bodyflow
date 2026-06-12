import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/logger";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("writes timestamp, level, scope and message", () => {
    logger.info("Withings", "Sync completed", { applied: 2 });

    expect(console.info).toHaveBeenCalledOnce();
    const line = vi.mocked(console.info).mock.calls[0]?.[0] as string;
    expect(line).toMatch(/^\[\d{4}-\d{2}-\d{2}T/);
    expect(line).toContain("INFO Withings: Sync completed");
    expect(line).toContain('"applied":2');
  });

  it("suppresses debug logs in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    logger.debug("Withings", "Diagnostic detail");

    expect(console.debug).not.toHaveBeenCalled();
  });
});
