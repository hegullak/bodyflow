import type { WithingsConnection } from "@/db/schema";
import {
  decryptWithingsToken,
  encryptWithingsToken,
  isEncryptedWithingsToken,
} from "./token-crypto";

export type WithingsConnectionSecrets = WithingsConnection & {
  accessToken: string;
  refreshToken: string;
};

export function decryptConnectionTokens(connection: WithingsConnection): WithingsConnectionSecrets {
  return {
    ...connection,
    accessToken: decryptWithingsToken(connection.accessToken),
    refreshToken: decryptWithingsToken(connection.refreshToken),
  };
}

export function encryptTokensForStorage(tokens: {
  accessToken: string;
  refreshToken: string;
}): { accessToken: string; refreshToken: string } {
  return {
    accessToken: encryptWithingsToken(tokens.accessToken),
    refreshToken: encryptWithingsToken(tokens.refreshToken),
  };
}

export function needsTokenEncryption(connection: WithingsConnection): boolean {
  return (
    !isEncryptedWithingsToken(connection.accessToken) ||
    !isEncryptedWithingsToken(connection.refreshToken)
  );
}
