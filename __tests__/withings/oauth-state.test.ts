import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getWithingsStateSecret,
  isWithingsOAuthStateConfigured,
  signWithingsOAuthState,
  verifyWithingsOAuthState,
} from "@/lib/withings/oauth-state";

describe("withings oauth state", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.WITHINGS_STATE_SECRET;
    delete process.env.CLERK_SECRET_KEY;
    delete process.env.WITHINGS_CLIENT_SECRET;
  });

  it("signs and verifies state in development with explicit secret", () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.WITHINGS_STATE_SECRET = "dev-state-secret";

    const state = signWithingsOAuthState("user_123");
    expect(verifyWithingsOAuthState(state)).toBe("user_123");
  });

  it("requires WITHINGS_STATE_SECRET in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.WITHINGS_STATE_SECRET;

    expect(() => getWithingsStateSecret()).toThrow(/WITHINGS_STATE_SECRET/);
    expect(isWithingsOAuthStateConfigured()).toBe(false);
    expect(() => signWithingsOAuthState("user_123")).toThrow(/WITHINGS_STATE_SECRET/);
  });

  it("uses WITHINGS_STATE_SECRET in production when set", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.WITHINGS_STATE_SECRET = "prod-state-secret";

    expect(isWithingsOAuthStateConfigured()).toBe(true);
    const state = signWithingsOAuthState("user_abc");
    expect(verifyWithingsOAuthState(state)).toBe("user_abc");
  });

  it("rejects tampered state", () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.WITHINGS_STATE_SECRET = "dev-state-secret";

    const state = signWithingsOAuthState("user_123");
    expect(verifyWithingsOAuthState(`${state}x`)).toBeNull();
  });
});
