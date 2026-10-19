interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function pruneBuckets(now: number): void {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
}

/**
 * Fixed-window in-memory limiter matching Laravel's RateLimiter::tooManyAttempts
 * semantics closely enough for the dev stack (single process).
 */
export function hitRateLimit(
  key: string,
  maxAttempts: number,
  decaySeconds: number,
): RateLimitResult {
  const now = Date.now();
  pruneBuckets(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + decaySeconds * 1000 });
    return { allowed: true, limit: maxAttempts, remaining: maxAttempts - 1, retryAfter: 0 };
  }

  if (bucket.count >= maxAttempts) {
    return {
      allowed: false,
      limit: maxAttempts,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    limit: maxAttempts,
    remaining: maxAttempts - bucket.count,
    retryAfter: 0,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "Retry-After": String(result.retryAfter),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
  };
}

export function clearRateLimits(): void {
  buckets.clear();
}
