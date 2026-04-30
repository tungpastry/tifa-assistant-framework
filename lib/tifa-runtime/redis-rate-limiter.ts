export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds?: number;
}

export interface DistributedRateLimiter {
  name: string;
  enabled: boolean;
  check(key: string, limit: number, windowMs: number): Promise<RateLimitDecision>;
}

export class RedisRateLimiterScaffold implements DistributedRateLimiter {
  name = "redis-rate-limiter";
  enabled = process.env.TIFA_REDIS_ENABLED === "1";

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitDecision> {
    void key;
    void windowMs;

    if (!this.enabled) {
      return {
        allowed: true,
        limit,
        remaining: limit,
      };
    }

    throw new Error("Redis rate limiter is enabled but no Redis client is wired yet.");
  }
}

