// Job Search Observability & Guardrails
// Circuit breaker, quota tracking, and logging for job providers

// ────────────────────────────────────────────────────────────────────────────
// Circuit Breaker
// Prevents cascading failures by temporarily disabling providers after errors
// ────────────────────────────────────────────────────────────────────────────

type CircuitState = 'closed' | 'open' | 'half-open';

type CircuitBreakerConfig = {
  failureThreshold: number;   // Number of failures before opening circuit
  resetTimeout: number;       // Time in ms before attempting half-open
  halfOpenSuccesses: number;  // Successes needed to close circuit
};

type CircuitBreakerState = {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: number | null;
  lastStateChange: number;
};

const defaultConfig: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  halfOpenSuccesses: 2,
};

const circuitStates = new Map<string, CircuitBreakerState>();

function getCircuitState(provider: string): CircuitBreakerState {
  if (!circuitStates.has(provider)) {
    circuitStates.set(provider, {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailure: null,
      lastStateChange: Date.now(),
    });
  }
  return circuitStates.get(provider)!;
}

export function isCircuitOpen(provider: string, config = defaultConfig): boolean {
  const state = getCircuitState(provider);
  const now = Date.now();
  
  if (state.state === 'open') {
    // Check if we should transition to half-open
    if (now - state.lastStateChange > config.resetTimeout) {
      state.state = 'half-open';
      state.successes = 0;
      state.lastStateChange = now;
      console.log(`🔄 (NO $) Circuit breaker for ${provider}: HALF-OPEN (testing)`);
      return false;
    }
    return true;
  }
  
  return false;
}

export function recordSuccess(provider: string, config = defaultConfig): void {
  const state = getCircuitState(provider);
  
  if (state.state === 'half-open') {
    state.successes++;
    if (state.successes >= config.halfOpenSuccesses) {
      state.state = 'closed';
      state.failures = 0;
      state.lastStateChange = Date.now();
      console.log(`✅ (NO $) Circuit breaker for ${provider}: CLOSED (recovered)`);
    }
  } else if (state.state === 'closed') {
    // Reset failures on success
    state.failures = Math.max(0, state.failures - 1);
  }
}

export function recordFailure(provider: string, config = defaultConfig): void {
  const state = getCircuitState(provider);
  const now = Date.now();
  
  state.failures++;
  state.lastFailure = now;
  
  if (state.state === 'half-open') {
    // Any failure in half-open reopens the circuit
    state.state = 'open';
    state.lastStateChange = now;
    console.log(`🔴 (NO $) Circuit breaker for ${provider}: OPEN (failed during test)`);
  } else if (state.state === 'closed' && state.failures >= config.failureThreshold) {
    state.state = 'open';
    state.lastStateChange = now;
    console.log(`🔴 (NO $) Circuit breaker for ${provider}: OPEN (threshold reached: ${state.failures} failures)`);
  }
}

export function getCircuitStatus(provider: string): { state: CircuitState; failures: number } {
  const state = getCircuitState(provider);
  return { state: state.state, failures: state.failures };
}

// ────────────────────────────────────────────────────────────────────────────
// Quota Tracking
// Tracks API usage to prevent overage and log costs
// ────────────────────────────────────────────────────────────────────────────

type QuotaConfig = {
  dailyLimit: number;
  warningThreshold: number; // Percentage (0-1) to warn
};

type QuotaState = {
  date: string;
  count: number;
  warned: boolean;
};

const quotaStates = new Map<string, QuotaState>();

const defaultQuotaConfig: QuotaConfig = {
  dailyLimit: 1000,
  warningThreshold: 0.8,
};

function getDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function getQuotaState(provider: string): QuotaState {
  const today = getDateString();
  const state = quotaStates.get(provider);
  
  // Reset if new day
  if (!state || state.date !== today) {
    const newState = { date: today, count: 0, warned: false };
    quotaStates.set(provider, newState);
    return newState;
  }
  
  return state;
}

export function checkQuota(provider: string, config = defaultQuotaConfig): boolean {
  const state = getQuotaState(provider);
  
  if (state.count >= config.dailyLimit) {
    console.error(`🚫 (NO $) Quota exceeded for ${provider}: ${state.count}/${config.dailyLimit}`);
    return false;
  }
  
  return true;
}

export function incrementQuota(provider: string, config = defaultQuotaConfig): void {
  const state = getQuotaState(provider);
  state.count++;
  
  const usage = state.count / config.dailyLimit;
  
  // Warn when approaching limit
  if (!state.warned && usage >= config.warningThreshold) {
    console.warn(`⚠️ (NO $) Quota warning for ${provider}: ${state.count}/${config.dailyLimit} (${(usage * 100).toFixed(0)}%)`);
    state.warned = true;
  }
  
  // Log every 100 requests
  if (state.count % 100 === 0) {
    console.log(`📊 (NO $) Quota usage for ${provider}: ${state.count}/${config.dailyLimit}`);
  }
}

export function getQuotaUsage(provider: string, config = defaultQuotaConfig): { count: number; limit: number; percentage: number } {
  const state = getQuotaState(provider);
  return {
    count: state.count,
    limit: config.dailyLimit,
    percentage: (state.count / config.dailyLimit) * 100,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Request Logging
// Structured logging for debugging and cost tracking
// ────────────────────────────────────────────────────────────────────────────

type RequestLog = {
  provider: string;
  timestamp: Date;
  durationMs: number;
  success: boolean;
  resultCount?: number;
  error?: string;
  cached: boolean;
};

const requestLogs: RequestLog[] = [];
const MAX_LOGS = 1000;

export function logRequest(log: RequestLog): void {
  requestLogs.push(log);
  
  // Keep only recent logs
  if (requestLogs.length > MAX_LOGS) {
    requestLogs.shift();
  }
  
  // Console log with cost indicator
  const costIndicator = log.cached ? '(NO $)' : '(IS $)';
  const status = log.success ? '✅' : '❌';
  
  console.log(`${status} ${costIndicator} [${log.provider}] ${log.durationMs}ms, results: ${log.resultCount ?? 'n/a'}${log.error ? `, error: ${log.error}` : ''}`);
}

export function getRecentLogs(count = 50): RequestLog[] {
  return requestLogs.slice(-count);
}

export function getProviderStats(provider: string, windowMs = 3600000): {
  requests: number;
  successes: number;
  failures: number;
  avgDurationMs: number;
  errorRate: number;
} {
  const cutoff = Date.now() - windowMs;
  const relevant = requestLogs.filter(
    l => l.provider === provider && l.timestamp.getTime() > cutoff
  );
  
  if (relevant.length === 0) {
    return { requests: 0, successes: 0, failures: 0, avgDurationMs: 0, errorRate: 0 };
  }
  
  const successes = relevant.filter(l => l.success).length;
  const failures = relevant.length - successes;
  const avgDuration = relevant.reduce((sum, l) => sum + l.durationMs, 0) / relevant.length;
  
  return {
    requests: relevant.length,
    successes,
    failures,
    avgDurationMs: Math.round(avgDuration),
    errorRate: failures / relevant.length,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Production Guard
// Ensures dev-only providers don't run in production
// ────────────────────────────────────────────────────────────────────────────

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function checkDevOnlyProvider(provider: string): boolean {
  const devOnlyProviders = ['linkedin', 'linkedin-rapid'];
  
  if (devOnlyProviders.includes(provider) && isProduction()) {
    console.warn(`🚫 (NO $) Provider ${provider} is disabled in production`);
    return false;
  }
  
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// Combined Guard Check
// Run all guards before making a provider request
// ────────────────────────────────────────────────────────────────────────────

export function canMakeRequest(provider: string): { allowed: boolean; reason?: string } {
  // Check production guard
  if (!checkDevOnlyProvider(provider)) {
    return { allowed: false, reason: 'Provider disabled in production' };
  }
  
  // Check circuit breaker
  if (isCircuitOpen(provider)) {
    return { allowed: false, reason: 'Circuit breaker open' };
  }
  
  // Check quota
  if (!checkQuota(provider)) {
    return { allowed: false, reason: 'Daily quota exceeded' };
  }
  
  return { allowed: true };
}



