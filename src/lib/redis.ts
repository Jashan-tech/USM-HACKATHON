// =============================================================================
// NEXUS HEALTH - Redis Client Configuration
// =============================================================================

import Redis from 'ioredis';

// Create Redis client singleton
let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  return redis;
}

// =============================================================================
// RATE LIMITING
// =============================================================================

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Sliding window rate limiter using Redis
 * @param key - Unique identifier for the rate limit (e.g., IP address, user ID)
 * @param limit - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const now = Date.now();
  const windowStart = now - windowMs;
  const redisKey = `ratelimit:${key}`;

  try {
    // Remove old entries outside the window
    await redis.zremrangebyscore(redisKey, 0, windowStart);

    // Count current entries
    const count = await redis.zcard(redisKey);

    if (count >= limit) {
      // Get the oldest entry to calculate reset time
      const oldest = await redis.zrange(redisKey, 0, 0, 'WITHSCORES');
      const resetAt = oldest.length > 1 ? parseInt(oldest[1]) + windowMs : now + windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Add new entry with current timestamp as score
    await redis.zadd(redisKey, now, `${now}:${Math.random()}`);
    await redis.expire(redisKey, Math.ceil(windowMs / 1000) + 1);

    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: now + windowMs,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if Redis is unavailable
    return {
      allowed: true,
      remaining: limit,
      resetAt: now + windowMs,
    };
  }
}

// =============================================================================
// CACHING
// =============================================================================

/**
 * Get cached value from Redis
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  try {
    const value = await redis.get(`cache:${key}`);
    if (value) {
      return JSON.parse(value) as T;
    }
    return null;
  } catch (error) {
    console.error('Cache get failed:', error);
    return null;
  }
}

/**
 * Set cached value in Redis
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttlSeconds - Time to live in seconds
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const redis = getRedisClient();
  try {
    await redis.setex(`cache:${key}`, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set failed:', error);
  }
}

/**
 * Delete cached value from Redis
 */
export async function deleteCached(key: string): Promise<void> {
  const redis = getRedisClient();
  try {
    await redis.del(`cache:${key}`);
  } catch (error) {
    console.error('Cache delete failed:', error);
  }
}

/**
 * Get or set cached value
 */
export async function getOrSetCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const cached = await getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  const value = await fetchFn();
  await setCached(key, value, ttlSeconds);
  return value;
}

// =============================================================================
// CLEANUP
// =============================================================================

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
