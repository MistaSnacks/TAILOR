// Rate limiting utility for API routes
// Simple in-memory rate limiter (per-user, per-endpoint)

type RateLimitConfig = {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
};

type UserRateLimitState = {
  timestamps: number[];
  endpoint: string;
};

// Store rate limit state per user and endpoint
// Format: Map<`${userId}:${endpoint}`, UserRateLimitState>
const rateLimitStore = new Map<string, UserRateLimitState>();

// Cleanup old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupOldEntries() {
  const now = Date.now();
  
  // Only cleanup every CLEANUP_INTERVAL_MS
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }
  
  lastCleanup = now;
  
  // Remove entries where all timestamps are outside any reasonable window
  const oldestTimestamp = now - (24 * 60 * 60 * 1000); // 24 hours ago
  
  for (const [key, state] of rateLimitStore.entries()) {
    // Remove old timestamps
    state.timestamps = state.timestamps.filter(ts => ts > oldestTimestamp);
    
    // Remove entry if no timestamps remain
    if (state.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check if a user has exceeded rate limit for an endpoint
 * @param userId - User ID
 * @param endpoint - Endpoint identifier (e.g., 'jobs/parse')
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  userId: string,
  endpoint: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number; limit: number } {
  const now = Date.now();
  const key = `${userId}:${endpoint}`;
  
  // Periodic cleanup
  cleanupOldEntries();
  
  // Get or create rate limit state
  let state = rateLimitStore.get(key);
  if (!state) {
    state = { timestamps: [], endpoint };
    rateLimitStore.set(key, state);
  }
  
  // Remove timestamps outside the time window
  const windowStart = now - config.windowMs;
  state.timestamps = state.timestamps.filter(ts => ts > windowStart);
  
  // Check if limit exceeded (before recording this request)
  const allowed = state.timestamps.length < config.maxRequests;
  
  // Calculate reset time (oldest timestamp in window + window duration, or now + window if empty)
  const resetAt = state.timestamps.length > 0
    ? Math.min(...state.timestamps) + config.windowMs
    : now + config.windowMs;
  
  // If allowed, record this request
  if (allowed) {
    state.timestamps.push(now);
  }
  
  // Calculate remaining AFTER recording (if allowed) or before (if not allowed)
  const currentCount = state.timestamps.length;
  const remaining = Math.max(0, config.maxRequests - currentCount);
  
  return { allowed, remaining, resetAt, limit: config.maxRequests };
}

/**
 * Create a rate limit configuration preset
 */
export const RateLimitPresets = {
  /** 10 requests per minute - for expensive operations like parsing */
  STRICT: { maxRequests: 10, windowMs: 60 * 1000 },
  /** 30 requests per minute - for moderate operations */
  MODERATE: { maxRequests: 30, windowMs: 60 * 1000 },
  /** 60 requests per minute - for light operations */
  RELAXED: { maxRequests: 60, windowMs: 60 * 1000 },
  /** 100 requests per hour - for very expensive operations */
  HOURLY_STRICT: { maxRequests: 100, windowMs: 60 * 60 * 1000 },
} as const;
