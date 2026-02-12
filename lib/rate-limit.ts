interface RateLimitEntry {
  attempts: number;
  resetAt: number;
}

// Support-specific rate limits by tier
export const RATE_LIMITS = {
  chat: {
    starter: { limit: 20, window: 60 * 60 * 1000 }, // 20/hour
    pro: { limit: 50, window: 60 * 60 * 1000 },     // 50/hour
    business: { limit: 100, window: 60 * 60 * 1000 } // 100/hour
  },
  ticket: {
    starter: { limit: 5, window: 24 * 60 * 60 * 1000 },   // 5/day
    pro: { limit: 5, window: 24 * 60 * 60 * 1000 },       // 5/day
    business: { limit: 5, window: 24 * 60 * 60 * 1000 }   // 5/day
  },
  org: {
    starter: { limit: 100, window: 60 * 60 * 1000 },  // 100/hour
    pro: { limit: 200, window: 60 * 60 * 1000 },      // 200/hour
    business: { limit: 500, window: 60 * 60 * 1000 }  // 500/hour
  }
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;
export type SubscriptionTier = 'starter' | 'pro' | 'business';

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || entry.resetAt < now) {
    // Reset or new entry
    rateLimitMap.set(identifier, {
      attempts: 1,
      resetAt: now + RATE_LIMIT_WINDOW
    });
    return { allowed: true, remaining: RATE_LIMIT_ATTEMPTS - 1 };
  }

  if (entry.attempts >= RATE_LIMIT_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.attempts++;
  return { allowed: true, remaining: RATE_LIMIT_ATTEMPTS - entry.attempts };
}

/**
 * Check rate limit with tier-based configuration
 * @param identifier - Unique identifier (e.g., user ID, org ID)
 * @param tier - Subscription tier (starter, pro, business)
 * @param type - Rate limit type (chat, ticket, org)
 * @returns Object with allowed status, remaining attempts, and reset timestamp
 */
export function checkRateLimitWithTier(
  identifier: string,
  tier: SubscriptionTier,
  type: RateLimitType
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const config = RATE_LIMITS[type][tier];
  const key = `${type}:${tier}:${identifier}`;
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    // Reset or new entry
    const resetAt = now + config.window;
    rateLimitMap.set(key, {
      attempts: 1,
      resetAt
    });
    return { allowed: true, remaining: config.limit - 1, resetAt };
  }

  if (entry.attempts >= config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.attempts++;
  return { 
    allowed: true, 
    remaining: config.limit - entry.attempts, 
    resetAt: entry.resetAt 
  };
}

export function getRateLimitReset(identifier: string): number | null {
  const entry = rateLimitMap.get(identifier);
  if (!entry) return null;
  return Math.ceil((entry.resetAt - Date.now()) / 1000);
}

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(key);
    }
  }
}, 60 * 60 * 1000);
