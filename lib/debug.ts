/**
 * Debug logging utilities that are gated behind NODE_ENV
 * All logs are stripped in production builds
 */

const isDev = process.env.NODE_ENV !== 'production';

type LogLevel = 'log' | 'info' | 'warn' | 'error';

function createLogger(level: LogLevel, prefix?: string) {
  return (...args: any[]) => {
    if (isDev) {
      const prefixStr = prefix ? `[${prefix}]` : '';
      console[level](prefixStr, ...args);
    }
  };
}

/**
 * Debug logger that only logs in development
 * Usage: debug.log('message'), debug.warn('warning'), debug.error('error')
 */
export const debug = {
  log: createLogger('log'),
  info: createLogger('info'),
  warn: createLogger('warn'),
  error: createLogger('error'),
};

/**
 * Create a namespaced debug logger
 * Usage: const log = createDebugLogger('MyComponent'); log.info('mounted');
 */
export function createDebugLogger(namespace: string) {
  return {
    log: createLogger('log', namespace),
    info: createLogger('info', namespace),
    warn: createLogger('warn', namespace),
    error: createLogger('error', namespace),
  };
}

/**
 * Log only in development - simple one-liner
 * Usage: devLog('🔐 Auth Status:', { status, hasSession });
 */
export function devLog(...args: any[]) {
  if (isDev) {
    console.log(...args);
  }
}

/**
 * Conditional debug log for expensive computations
 * Only evaluates the log function in development
 * Usage: devLogLazy(() => ({ expensive: computeExpensiveValue() }));
 */
export function devLogLazy(fn: () => any) {
  if (isDev) {
    console.log(fn());
  }
}

