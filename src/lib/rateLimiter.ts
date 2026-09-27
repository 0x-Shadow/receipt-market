const buckets = new Map<string, number[]>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, timestamps] of buckets) {
    const recent = timestamps.filter((t) => now - t < CLEANUP_INTERVAL_MS * 2);
    if (recent.length === 0) {
      buckets.delete(key);
    } else {
      buckets.set(key, recent);
    }
  }
}

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  cleanup();
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= maxRequests) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  return true;
}

export function getRemainingRequests(key: string, maxRequests: number, windowMs: number): number {
  cleanup();
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  return Math.max(0, maxRequests - recent.length);
}
