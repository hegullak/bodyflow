export type WithingsConnectionPublic = {
  connected: boolean;
  lastSyncAt: Date | null;
};

export function toWithingsConnectionPublic(
  connection: { lastSyncAt: Date | null } | null,
): WithingsConnectionPublic {
  return {
    connected: connection != null,
    lastSyncAt: connection?.lastSyncAt ?? null,
  };
}
