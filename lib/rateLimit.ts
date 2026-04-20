import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '10 m'),
  analytics: true,
});

export async function rateLimit(options: { key: string }): Promise<RateLimitResult> {
  const { success, reset } = await ratelimit.limit(options.key);
  if (success) {
    return { ok: true };
  }
  const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return { ok: false, retryAfterSeconds };
}

