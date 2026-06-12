import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptWithingsToken,
  encryptWithingsToken,
  isEncryptedWithingsToken,
  WITHINGS_TOKEN_PREFIX,
} from "@/lib/withings/token-crypto";

const TEST_KEY_BASE64 = Buffer.alloc(32, 7).toString("base64");

describe("withings token crypto", () => {
  beforeEach(() => {
    process.env.WITHINGS_TOKEN_ENCRYPTION_KEY = TEST_KEY_BASE64;
  });

  afterEach(() => {
    delete process.env.WITHINGS_TOKEN_ENCRYPTION_KEY;
  });

  it("encrypts and decrypts a token round-trip", () => {
    const token = "sample-access-token-12345";
    const encrypted = encryptWithingsToken(token);

    expect(isEncryptedWithingsToken(encrypted)).toBe(true);
    expect(encrypted.startsWith(WITHINGS_TOKEN_PREFIX)).toBe(true);
    expect(decryptWithingsToken(encrypted)).toBe(token);
  });

  it("detects encrypted values", () => {
    expect(isEncryptedWithingsToken("plain-token")).toBe(false);
    expect(isEncryptedWithingsToken(`${WITHINGS_TOKEN_PREFIX}abc.def.ghi`)).toBe(true);
  });

  it("passes through legacy plaintext until migrated", () => {
    const legacy = "legacy-plaintext-refresh-token";
    expect(decryptWithingsToken(legacy)).toBe(legacy);
  });

  it("produces different ciphertext for the same token", () => {
    const token = "rotating-token";
    const a = encryptWithingsToken(token);
    const b = encryptWithingsToken(token);
    expect(a).not.toBe(b);
    expect(decryptWithingsToken(a)).toBe(token);
    expect(decryptWithingsToken(b)).toBe(token);
  });

  it("rejects invalid key format", () => {
    process.env.WITHINGS_TOKEN_ENCRYPTION_KEY = "too-short";
    expect(() => encryptWithingsToken("x")).toThrow();
  });
});
