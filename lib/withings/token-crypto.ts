import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const WITHINGS_TOKEN_PREFIX = "wte1:";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

function parseEncryptionKey(raw: string): Buffer {
  const trimmed = raw.trim();

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  const fromBase64 = Buffer.from(trimmed, "base64");
  if (fromBase64.length === KEY_BYTES) {
    return fromBase64;
  }

  throw new Error(
    "WITHINGS_TOKEN_ENCRYPTION_KEY must be 32 bytes as base64 or 64 hex characters.",
  );
}

export function getWithingsTokenEncryptionKey(): Buffer {
  const raw = process.env.WITHINGS_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("WITHINGS_TOKEN_ENCRYPTION_KEY is not set.");
  }
  return parseEncryptionKey(raw);
}

export function isEncryptedWithingsToken(value: string): boolean {
  return value.startsWith(WITHINGS_TOKEN_PREFIX);
}

export function encryptWithingsToken(token: string): string {
  const key = getWithingsTokenEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    WITHINGS_TOKEN_PREFIX,
    iv.toString("base64url"),
    ".",
    tag.toString("base64url"),
    ".",
    ciphertext.toString("base64url"),
  ].join("");
}

export function decryptWithingsToken(value: string): string {
  if (!isEncryptedWithingsToken(value)) {
    return value;
  }

  const payload = value.slice(WITHINGS_TOKEN_PREFIX.length);
  const [ivPart, tagPart, ciphertextPart] = payload.split(".");
  if (!ivPart || !tagPart || !ciphertextPart) {
    throw new Error("Invalid encrypted Withings token format.");
  }

  const key = getWithingsTokenEncryptionKey();
  const iv = Buffer.from(ivPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  const ciphertext = Buffer.from(ciphertextPart, "base64url");

  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("Invalid encrypted Withings token components.");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
