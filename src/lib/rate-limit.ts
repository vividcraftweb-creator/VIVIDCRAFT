import { NextRequest } from 'next/server';

interface RateLimitConfig {
  interval: number; // milliseconds
  maxRequests: number;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// Simple in-memory rate limiter
// Note: This resets on server restart and doesn't work across multiple instances
// For production with multiple servers, consider using Redis with @upstash/ratelimit
const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function createRateLimiter(config: RateLimitConfig) {
  return async (req: NextRequest, identifier: string): Promise<{ success: boolean; resetTime?: number }> => {
    const now = Date.now();
    const record = rateLimitMap.get(identifier);

    // If no record or expired, create new record
    if (!record || now > record.resetTime) {
      rateLimitMap.set(identifier, {
        count: 1,
        resetTime: now + config.interval,
      });
      return { success: true };
    }

    // Check if limit exceeded
    if (record.count >= config.maxRequests) {
      return {
        success: false,
        resetTime: record.resetTime,
      };
    }

    // Increment count
    record.count++;
    return { success: true };
  };
}

// Pre-configured rate limiters
export const signupRateLimit = createRateLimiter({
  interval: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
});

export const emailRateLimit = createRateLimiter({
  interval: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
});

export const ticketRateLimit = createRateLimiter({
  interval: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
});

// Helper to get client IP
export function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
