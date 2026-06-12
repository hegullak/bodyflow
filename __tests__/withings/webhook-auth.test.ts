import { afterEach, describe, expect, it } from "vitest";
import {
  getWithingsWebhookSecret,
  isWithingsWebhookSecretRequired,
  verifyWithingsWebhookSecret,
} from "@/lib/withings/webhook-auth";

describe("withings webhook auth", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    delete process.env.WITHINGS_WEBHOOK_SECRET;
  });

  it("does not require secret for localhost", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3010";
    expect(isWithingsWebhookSecretRequired()).toBe(false);
  });

  it("requires secret for public app URLs", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://bodyflow.echonote.no";
    expect(isWithingsWebhookSecretRequired()).toBe(true);
  });

  it("verifies matching webhook secret with timing-safe compare", () => {
    process.env.WITHINGS_WEBHOOK_SECRET = "webhook-test-secret";
    expect(getWithingsWebhookSecret()).toBe("webhook-test-secret");
    expect(verifyWithingsWebhookSecret("webhook-test-secret")).toBe(true);
    expect(verifyWithingsWebhookSecret("wrong-secret")).toBe(false);
  });
});
