/**
 * Very small in-memory rate limiter (per server instance) to protect the
 * AI budget from abuse on a public demo URL. Good enough for an MVP;
 * a shared store (e.g. Upstash Redis) is listed as a v2 improvement.
 */
const hits = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit = Number(process.env.RATE_LIMIT_PER_HOUR ?? 20),
  windowMs = 60 * 60 * 1000,
  now = Date.now(),
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    const retryAfterSec = Math.ceil((windowMs - (now - recent[0])) / 1000);
    hits.set(key, recent);
    return { allowed: false, remaining: 0, retryAfterSec };
  }
  recent.push(now);
  hits.set(key, recent);
  return { allowed: true, remaining: limit - recent.length, retryAfterSec: 0 };
}

export function resetRateLimit(): void {
  hits.clear();
}
