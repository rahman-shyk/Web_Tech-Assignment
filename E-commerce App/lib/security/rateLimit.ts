type RateLimitEntry = { count: number; expiresAt: number };
const buckets = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (current.count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  current.count += 1;
  buckets.set(key, current);
  return { allowed: true, remaining: Math.max(limit - current.count, 0) };
}
