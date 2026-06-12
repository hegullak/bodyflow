import { describe, expect, it } from "vitest";
import { buildAppUrl, getAppOrigin, getWithingsCallbackUrl } from "@/lib/app-url";

describe("app url helpers", () => {
  it("uses forwarded host behind ngrok instead of localhost", () => {
    const request = new Request("http://localhost:3010/api/integrations/withings/callback?code=x", {
      headers: {
        "x-forwarded-host": "ivory-slashed-antiviral.ngrok-free.dev",
        "x-forwarded-proto": "https",
      },
    });

    expect(getAppOrigin(request)).toBe("https://ivory-slashed-antiviral.ngrok-free.dev");
    expect(getWithingsCallbackUrl(request)).toBe(
      "https://ivory-slashed-antiviral.ngrok-free.dev/api/integrations/withings/callback",
    );
    expect(buildAppUrl(request, "/profile?withings=connected").toString()).toBe(
      "https://ivory-slashed-antiviral.ngrok-free.dev/profile?withings=connected",
    );
  });

  it("falls back to request url without forwarded headers", () => {
    const request = new Request("http://localhost:3010/profile");
    expect(getAppOrigin(request)).toBe("http://localhost:3010");
  });
});
