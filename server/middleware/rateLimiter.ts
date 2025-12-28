/**
 * Ruzn-Lite Rate Limiter Middleware
 * 
 * Implements sliding window rate limiting using Redis.
 * Falls back to in-memory limiting for development.
 */

import { TRPCError } from '@trpc/server';

// Try to use Redis, fall back to in-memory
let redis: any = null;
try {
  if (process.env.REDIS_URL) {
    const { Redis } = require('ioredis');
    redis = new Redis(process.env.REDIS_URL);
  }
} catch {
  console.warn('Redis not available for rate limiting, using in-memory');
}

// In-memory fallback store
const inMemoryStore: Map<string, number[]> = new Map();

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyPrefix: string;     // Redis key prefix
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// Preset configurations for different endpoint types
export const RATE_LIMITS = {
  // LLM endpoints - most expensive, strictest limits
  llm: { 
    windowMs: 60_000, 
    maxRequests: 10, 
    keyPrefix: 'rl:llm:' 
  },
  
  // Streaming chat - slightly higher limit
  chat: { 
    windowMs: 60_000, 
    maxRequests: 20, 
    keyPrefix: 'rl:chat:' 
  },
  
  // Dashboard/analytics - less expensive
  dashboard: { 
    windowMs: 60_000, 
    maxRequests: 60, 
    keyPrefix: 'rl:dash:' 
  },
  
  // Search endpoints
  search: { 
    windowMs: 60_000, 
    maxRequests: 100, 
    keyPrefix: 'rl:search:' 
  },
  
  // File uploads - hourly limit
  upload: { 
    windowMs: 3600_000, 
    maxRequests: 20, 
    keyPrefix: 'rl:upload:' 
  },

  // Admin operations
  admin: {
    windowMs: 60_000,
    maxRequests: 30,
    keyPrefix: 'rl:admin:'
  }
} as const;

/**
 * Check rate limit for a user
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `${config.keyPrefix}${userId}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  if (redis) {
    return checkRateLimitRedis(key, config, now, windowStart);
  } else {
    return checkRateLimitMemory(key, config, now, windowStart);
  }
}

/**
 * Redis-based rate limiting with sorted sets
 */
async function checkRateLimitRedis(
  key: string,
  config: RateLimitConfig,
  now: number,
  windowStart: number
): Promise<RateLimitResult> {
  // Remove old entries outside the window
  await redis.zremrangebyscore(key, 0, windowStart);
  
  // Count requests in window
  const requestCount = await redis.zcard(key);

  if (requestCount >= config.maxRequests) {
    // Get oldest request to calculate reset time
    const oldestReq = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const resetAt = oldestReq.length 
      ? Number(oldestReq[1]) + config.windowMs 
      : now + config.windowMs;
    
    return { 
      allowed: false, 
      remaining: 0, 
      resetAt 
    };
  }

  // Add current request with timestamp as score
  const requestId = `${now}-${Math.random().toString(36).substr(2, 9)}`;
  await redis.zadd(key, now, requestId);
  await redis.expire(key, Math.ceil(config.windowMs / 1000));

  return {
    allowed: true,
    remaining: config.maxRequests - requestCount - 1,
    resetAt: now + config.windowMs
  };
}

/**
 * In-memory rate limiting fallback
 */
function checkRateLimitMemory(
  key: string,
  config: RateLimitConfig,
  now: number,
  windowStart: number
): RateLimitResult {
  // Get or create entry
  let timestamps = inMemoryStore.get(key) || [];
  
  // Remove old entries
  timestamps = timestamps.filter(ts => ts > windowStart);
  
  if (timestamps.length >= config.maxRequests) {
    const resetAt = timestamps[0] + config.windowMs;
    return { 
      allowed: false, 
      remaining: 0, 
      resetAt 
    };
  }

  // Add current request
  timestamps.push(now);
  inMemoryStore.set(key, timestamps);

  // Cleanup old keys periodically
  if (Math.random() < 0.01) {
    cleanupMemoryStore();
  }

  return {
    allowed: true,
    remaining: config.maxRequests - timestamps.length,
    resetAt: now + config.windowMs
  };
}

/**
 * Cleanup old entries from memory store
 */
function cleanupMemoryStore(): void {
  const now = Date.now();
  const maxAge = 3600_000; // 1 hour
  
  for (const [key, timestamps] of inMemoryStore.entries()) {
    const recent = timestamps.filter(ts => ts > now - maxAge);
    if (recent.length === 0) {
      inMemoryStore.delete(key);
    } else {
      inMemoryStore.set(key, recent);
    }
  }
}

/**
 * Create a tRPC middleware for rate limiting
 */
export function createRateLimitedProcedure(config: RateLimitConfig) {
  return async (opts: { 
    ctx: { user: { id: string } }; 
    next: () => Promise<any>;
  }) => {
    const result = await checkRateLimit(opts.ctx.user.id, config);
    
    if (!result.allowed) {
      const resetDate = new Date(result.resetAt);
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded. Try again at ${resetDate.toISOString()}. Remaining: ${result.remaining}`
      });
    }
    
    return opts.next();
  };
}

/**
 * Express middleware for rate limiting (alternative to tRPC middleware)
 */
export function rateLimitMiddleware(config: RateLimitConfig) {
  return async (req: any, res: any, next: any) => {
    const userId = req.user?.id || req.ip || 'anonymous';
    const result = await checkRateLimit(userId, config);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));
    
    if (!result.allowed) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
      });
      return;
    }
    
    next();
  };
}
