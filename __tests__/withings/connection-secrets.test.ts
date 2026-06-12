import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { WithingsConnection } from "@/db/schema";
import {
  decryptConnectionTokens,
  encryptTokensForStorage,
  needsTokenEncryption,
} from "@/lib/withings/connection-secrets";
import { encryptWithingsToken } from "@/lib/withings/token-crypto";

const TEST_KEY_BASE64 = Buffer.alloc(32, 3).toString("base64");

function sampleConnection(overrides: Partial<WithingsConnection> = {}): WithingsConnection {
  return {
    id: "conn-1",
    userId: "user_1",
    withingsUserId: "withings_1",
    accessToken: "access-plain",
    refreshToken: "refresh-plain",
    tokenExpiresAt: new Date("2026-01-01T00:00:00Z"),
    scope: "user.metrics",
    lastSyncAt: null,
    lastWithingsUpdate: null,
    webhookSubscribed: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("withings connection secrets", () => {
  beforeEach(() => {
    process.env.WITHINGS_TOKEN_ENCRYPTION_KEY = TEST_KEY_BASE64;
  });

  afterEach(() => {
    delete process.env.WITHINGS_TOKEN_ENCRYPTION_KEY;
  });

  it("encrypts tokens for storage", () => {
    const sealed = encryptTokensForStorage({
      accessToken: "access-plain",
      refreshToken: "refresh-plain",
    });

    expect(sealed.accessToken).not.toBe("access-plain");
    expect(sealed.refreshToken).not.toBe("refresh-plain");
  });

  it("decrypts encrypted connection tokens", () => {
    const sealed = encryptTokensForStorage({
      accessToken: "access-plain",
      refreshToken: "refresh-plain",
    });
    const decrypted = decryptConnectionTokens(
      sampleConnection({
        accessToken: sealed.accessToken,
        refreshToken: sealed.refreshToken,
      }),
    );

    expect(decrypted.accessToken).toBe("access-plain");
    expect(decrypted.refreshToken).toBe("refresh-plain");
  });

  it("detects rows that still need encryption", () => {
    expect(needsTokenEncryption(sampleConnection())).toBe(true);
    expect(
      needsTokenEncryption(
        sampleConnection({
          accessToken: encryptWithingsToken("a"),
          refreshToken: encryptWithingsToken("b"),
        }),
      ),
    ).toBe(false);
  });
});
