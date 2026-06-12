const KASSAL_API_BASE = "https://kassal.app/api/v1";

export function getKassalConfig() {
  const apiKey = process.env.KASSAL_API_KEY;
  if (!apiKey) return null;
  return { apiKey, apiBase: KASSAL_API_BASE };
}

export function isKassalConfigured(): boolean {
  return getKassalConfig() !== null;
}
