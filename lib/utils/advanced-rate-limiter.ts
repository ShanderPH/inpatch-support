interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
  windowSizeMs: number;
}

interface RateLimitState {
  requests: number[];
  burstCount: number;
  lastReset: number;
  blocked: boolean;
  blockUntil: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

/**
 * Advanced rate limiter with sliding window, burst protection, and adaptive throttling
 */
export class AdvancedRateLimiter {
  private limits: Map<string, RateLimitState> = new Map();
  private config: RateLimitConfig;
  private retryConfig: RetryConfig;

  constructor(
    config: RateLimitConfig = {
      requestsPerSecond: 10,
      requestsPerMinute: 300,
      requestsPerHour: 18000,
      burstLimit: 20,
      windowSizeMs: 1000,
    },
    retryConfig: RetryConfig = {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
    }
  ) {
    this.config = config;
    this.retryConfig = retryConfig;
    this.startCleanupTimer();
  }

  /**
   * Check if request is allowed with sliding window algorithm
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    let state = this.limits.get(key);

    if (!state) {
      state = {
        requests: [],
        burstCount: 0,
        lastReset: now,
        blocked: false,
        blockUntil: 0,
      };
      this.limits.set(key, state);
    }

    // Check if still blocked
    if (state.blocked && now < state.blockUntil) {
      return false;
    } else if (state.blocked && now >= state.blockUntil) {
      // Unblock and reset
      state.blocked = false;
      state.blockUntil = 0;
      state.requests = [];
      state.burstCount = 0;
    }

    // Clean old requests (sliding window)
    const oneSecondAgo = now - 1000;
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    state.requests = state.requests.filter(timestamp => timestamp > oneHourAgo);

    // Count requests in different windows
    const requestsLastSecond = state.requests.filter(
      t => t > oneSecondAgo
    ).length;
    const requestsLastMinute = state.requests.filter(
      t => t > oneMinuteAgo
    ).length;
    const requestsLastHour = state.requests.length;

    // Check burst limit
    if (state.burstCount >= this.config.burstLimit) {
      const timeSinceLastReset = now - state.lastReset;

      if (timeSinceLastReset < this.config.windowSizeMs) {
        this.blockTemporarily(state, now);

        return false;
      } else {
        state.burstCount = 0;
        state.lastReset = now;
      }
    }

    // Check rate limits
    if (
      requestsLastSecond >= this.config.requestsPerSecond ||
      requestsLastMinute >= this.config.requestsPerMinute ||
      requestsLastHour >= this.config.requestsPerHour
    ) {
      this.blockTemporarily(state, now);

      return false;
    }

    // Allow request and record it
    state.requests.push(now);
    state.burstCount++;

    return true;
  }

  /**
   * Block temporarily with exponential backoff
   */
  private blockTemporarily(state: RateLimitState, now: number): void {
    state.blocked = true;
    const blockDuration = Math.min(
      this.retryConfig.baseDelay * Math.pow(2, state.burstCount / 10),
      this.retryConfig.maxDelay
    );

    state.blockUntil = now + blockDuration;
  }

  /**
   * Wait for rate limit to allow request
   */
  async waitForAllowance(key: string): Promise<void> {
    let attempts = 0;

    while (!this.isAllowed(key) && attempts < this.retryConfig.maxRetries) {
      const delay = this.calculateDelay(attempts);

      await this.sleep(delay);
      attempts++;
    }

    if (attempts >= this.retryConfig.maxRetries) {
      throw new Error(`Rate limit exceeded after ${attempts} attempts`);
    }
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    const baseDelay = this.retryConfig.baseDelay;
    const exponentialDelay =
      baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt);
    const cappedDelay = Math.min(exponentialDelay, this.retryConfig.maxDelay);

    if (this.retryConfig.jitter) {
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * cappedDelay;

      return cappedDelay + jitter;
    }

    return cappedDelay;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get rate limit status
   */
  getStatus(key: string): {
    allowed: boolean;
    remaining: {
      perSecond: number;
      perMinute: number;
      perHour: number;
    };
    resetTime: number;
    blocked: boolean;
    blockUntil: number;
  } {
    const state = this.limits.get(key);
    const now = Date.now();

    if (!state) {
      return {
        allowed: true,
        remaining: {
          perSecond: this.config.requestsPerSecond,
          perMinute: this.config.requestsPerMinute,
          perHour: this.config.requestsPerHour,
        },
        resetTime: now + 1000,
        blocked: false,
        blockUntil: 0,
      };
    }

    const oneSecondAgo = now - 1000;
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    const requestsLastSecond = state.requests.filter(
      t => t > oneSecondAgo
    ).length;
    const requestsLastMinute = state.requests.filter(
      t => t > oneMinuteAgo
    ).length;
    const requestsLastHour = state.requests.filter(t => t > oneHourAgo).length;

    return {
      allowed: !state.blocked && now >= state.blockUntil,
      remaining: {
        perSecond: Math.max(
          0,
          this.config.requestsPerSecond - requestsLastSecond
        ),
        perMinute: Math.max(
          0,
          this.config.requestsPerMinute - requestsLastMinute
        ),
        perHour: Math.max(0, this.config.requestsPerHour - requestsLastHour),
      },
      resetTime: now + 1000,
      blocked: state.blocked,
      blockUntil: state.blockUntil,
    };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.limits.clear();
  }

  /**
   * Start cleanup timer to remove old entries
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;

      for (const [key, state] of this.limits.entries()) {
        // Remove entries that haven't been used in over an hour
        if (
          state.requests.length === 0 ||
          Math.max(...state.requests) < oneHourAgo
        ) {
          this.limits.delete(key);
        }
      }
    }, 300000); // Cleanup every 5 minutes
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalKeys: number;
    blockedKeys: number;
    totalRequests: number;
    averageRequestsPerKey: number;
  } {
    const now = Date.now();
    let totalRequests = 0;
    let blockedKeys = 0;

    for (const state of this.limits.values()) {
      totalRequests += state.requests.length;
      if (state.blocked && now < state.blockUntil) {
        blockedKeys++;
      }
    }

    return {
      totalKeys: this.limits.size,
      blockedKeys,
      totalRequests,
      averageRequestsPerKey:
        this.limits.size > 0 ? totalRequests / this.limits.size : 0,
    };
  }
}

/**
 * Enhanced error handling with categorization and recovery strategies
 */
export class EnhancedErrorHandler {
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, { error: Error; timestamp: number }> =
    new Map();

  /**
   * Categorize error and determine retry strategy
   */
  categorizeError(error: any): {
    category:
      | 'network'
      | 'rate_limit'
      | 'auth'
      | 'client'
      | 'server'
      | 'unknown';
    shouldRetry: boolean;
    retryAfter?: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  } {
    if (error?.status || error?.code) {
      const status = error.status || error.code;

      switch (true) {
        case status === 401 || status === 403:
          return {
            category: 'auth',
            shouldRetry: false,
            severity: 'critical',
          };

        case status === 429:
          return {
            category: 'rate_limit',
            shouldRetry: true,
            retryAfter: this.extractRetryAfter(error),
            severity: 'medium',
          };

        case status >= 400 && status < 500:
          return {
            category: 'client',
            shouldRetry: false,
            severity: 'high',
          };

        case status >= 500:
          return {
            category: 'server',
            shouldRetry: true,
            severity: 'high',
          };

        case status === 0 ||
          error.message?.includes('network') ||
          error.message?.includes('fetch'):
          return {
            category: 'network',
            shouldRetry: true,
            severity: 'medium',
          };

        default:
          return {
            category: 'unknown',
            shouldRetry: true,
            severity: 'medium',
          };
      }
    }

    // Handle network errors
    if (
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('Network request failed') ||
      error.name === 'NetworkError'
    ) {
      return {
        category: 'network',
        shouldRetry: true,
        severity: 'medium',
      };
    }

    return {
      category: 'unknown',
      shouldRetry: true,
      severity: 'low',
    };
  }

  /**
   * Extract retry-after header value
   */
  private extractRetryAfter(error: any): number | undefined {
    if (error.headers?.['retry-after']) {
      const retryAfter = parseInt(error.headers['retry-after']);

      return isNaN(retryAfter) ? undefined : retryAfter * 1000;
    }

    return undefined;
  }

  /**
   * Record error for tracking
   */
  recordError(key: string, error: Error): void {
    const count = this.errorCounts.get(key) || 0;

    this.errorCounts.set(key, count + 1);
    this.lastErrors.set(key, { error, timestamp: Date.now() });
  }

  /**
   * Check if endpoint is healthy
   */
  isEndpointHealthy(key: string, threshold: number = 5): boolean {
    const errorCount = this.errorCounts.get(key) || 0;
    const lastError = this.lastErrors.get(key);

    // If no recent errors, consider healthy
    if (!lastError) return true;

    // If too many errors, consider unhealthy
    if (errorCount >= threshold) {
      // But allow recovery after 5 minutes
      const timeSinceLastError = Date.now() - lastError.timestamp;

      if (timeSinceLastError > 300000) {
        this.errorCounts.set(key, 0);

        return true;
      }

      return false;
    }

    return true;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    unhealthyEndpoints: string[];
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    const errorsByCategory: Record<string, number> = {};
    const unhealthyEndpoints: string[] = [];

    for (const [key, error] of this.lastErrors.entries()) {
      const category = this.categorizeError(error.error).category;

      errorsByCategory[category] = (errorsByCategory[category] || 0) + 1;

      if (!this.isEndpointHealthy(key)) {
        unhealthyEndpoints.push(key);
      }
    }

    return {
      totalErrors,
      errorsByCategory,
      unhealthyEndpoints,
    };
  }

  /**
   * Reset error tracking for a key
   */
  resetErrors(key: string): void {
    this.errorCounts.delete(key);
    this.lastErrors.delete(key);
  }

  /**
   * Reset all error tracking
   */
  resetAllErrors(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }
}

// Export singleton instances
export const advancedRateLimiter = new AdvancedRateLimiter();
export const enhancedErrorHandler = new EnhancedErrorHandler();
