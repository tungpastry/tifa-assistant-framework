// NOTE: This is a simple in-memory rate limiter suitable for single-node deployments
// or local development. For multi-instance production environments, use an external
// service like Redis, or a platform-level/reverse-proxy rate limiter.

import { type NextRequest } from "next/server";

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: Date;
}

interface RateLimitBucket {
  count: number;
  resetAt: number; // Unix timestamp in milliseconds
}

// Module-level map to store rate limit buckets.
const buckets = new Map<string, RateLimitBucket>();
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let lastCleanup = Date.now();

/**
 * Periodically cleans up expired buckets to prevent memory leaks.
 */
function cleanupExpiredBuckets() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }
  
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt < now) {
      buckets.delete(key);
    }
  }
  lastCleanup = now;
}

/**
 * Checks if a request is allowed under the given rate limit options.
 */
export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  cleanupExpiredBuckets(); // Opportunistic cleanup
  
  const now = Date.now();
  let bucket = buckets.get(options.key);

  if (!bucket || bucket.resetAt < now) {
    bucket = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    buckets.set(options.key, bucket);
  } else {
    bucket.count++;
  }
  
  const remaining = Math.max(0, options.limit - bucket.count);
  const allowed = bucket.count <= options.limit;
  
  const retryAfterSeconds = allowed
    ? 0
    : Math.ceil((bucket.resetAt - now) / 1000);

  return {
    allowed,
    remaining,
    retryAfterSeconds,
    resetAt: new Date(bucket.resetAt),
  };
}

/**
 * Safely parses a string into a positive integer, with a fallback.
 */
export function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

/**
 * Gets the client's IP address from the request headers.
 * Prefers x-forwarded-for -> x-real-ip.
 */
export function getClientIp(req: NextRequest | Request): string {
  let ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim();
  if (ip) return ip;

  ip = req.headers.get("x-real-ip")?.trim();
  if (ip) return ip;
  
  return "unknown";
}
