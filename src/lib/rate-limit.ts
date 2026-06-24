import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

const RATE_LIMIT_PREFIX = "ratelimit";

/**
 * Redis-based distributed rate limiter.
 *
 * Uses INCR + PEXPIRE to count requests per key within a fixed window.
 * Fails open on Redis errors to preserve availability (logs a warning).
 * Works correctly across multiple server processes and restarts.
 */
export async function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number }
): Promise<void> {
  const redisKey = `${RATE_LIMIT_PREFIX}:${key}`;

  try {
    const count = await redis.incr(redisKey);

    if (count === 1) {
      await redis.pexpire(redisKey, options.windowMs);
    }

    if (count > options.limit) {
      throw new Error("Too many requests. Please try again later.");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Too many requests. Please try again later.") {
      throw error;
    }
    logger.warn("rate_limit.redis_error", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
