const WINDOW_MS = 60_000;
const registry = new Map<string, number[]>();

export function isRateLimited(key: string, limitPerMinute: number): boolean {
  const now = Date.now();
  const hits = (registry.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= limitPerMinute) return true;
  hits.push(now);
  registry.set(key, hits);
  return false;
}
