/**
 * AI Request Manager
 * Central queue for all AI API calls with concurrency control, timeouts,
 * retries with exponential backoff, and rate limiting.
 */

interface QueuedRequest<T> {
    execute: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (error: Error) => void;
    retries: number;
    feature: string;
}

interface RequestManagerConfig {
    /** Max concurrent AI requests (default: 3) */
    maxConcurrent: number;
    /** Request timeout in ms (default: 60000) */
    timeoutMs: number;
    /** Max retry attempts (default: 2, so 3 total tries) */
    maxRetries: number;
    /** Base delay for exponential backoff in ms (default: 1000) */
    baseRetryDelayMs: number;
    /** Max requests per minute (default: 30) */
    maxRequestsPerMinute: number;
    /** Max requests per rolling 24h window (default: 500) */
    maxRequestsPerDay: number;
    /** Max requests per rolling 30d window (default: 5000) */
    maxRequestsPerMonth: number;
}

const DEFAULT_CONFIG: RequestManagerConfig = {
    maxConcurrent: 3,
    timeoutMs: 60_000,
    maxRetries: 2,
    baseRetryDelayMs: 1_000,
    maxRequestsPerMinute: 30,
    maxRequestsPerDay: 500,
    maxRequestsPerMonth: 5_000,
};

const ONE_MINUTE_MS = 60_000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_MONTH_MS = 30 * ONE_DAY_MS;

/**
 * Thrown when the daily or monthly request ceiling is exceeded. These are
 * hard caps (not merely throttled) so callers see a clear failure instead
 * of waiting forever in the queue.
 */
export class AIQuotaExceededError extends Error {
    constructor(public readonly window: 'day' | 'month', public readonly cap: number) {
        super(`AI request quota exceeded for window=${window} cap=${cap}`);
        this.name = 'AIQuotaExceededError';
    }
}

class AIRequestManager {
    private config: RequestManagerConfig;
    private queue: QueuedRequest<any>[] = [];
    private activeCount = 0;
    private requestTimestamps: number[] = [];

    constructor(config: Partial<RequestManagerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Enqueue an AI request. It will execute when a slot is available
     * and rate limits allow.
     */
    enqueue<T>(
        execute: () => Promise<T>,
        feature: string
    ): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            // Fail fast on daily/monthly caps so users see a real error
            // instead of the request sitting in the queue forever.
            const dailyCount = this.getRequestCountSince(ONE_DAY_MS);
            if (dailyCount >= this.config.maxRequestsPerDay) {
                reject(new AIQuotaExceededError('day', this.config.maxRequestsPerDay));
                return;
            }
            const monthlyCount = this.getRequestCountSince(ONE_MONTH_MS);
            if (monthlyCount >= this.config.maxRequestsPerMonth) {
                reject(new AIQuotaExceededError('month', this.config.maxRequestsPerMonth));
                return;
            }

            this.queue.push({
                execute,
                resolve,
                reject,
                retries: 0,
                feature,
            });
            this.drain();
        });
    }

    /**
     * Get current queue stats for monitoring.
     */
    getStats() {
        return {
            queued: this.queue.length,
            active: this.activeCount,
            requestsInLastMinute: this.getRecentRequestCount(),
            requestsInLastDay: this.getRequestCountSince(ONE_DAY_MS),
            requestsInLastMonth: this.getRequestCountSince(ONE_MONTH_MS),
        };
    }

    // ─── Internals ─────────────────────────────────────────────

    private drain() {
        while (
            this.queue.length > 0 &&
            this.activeCount < this.config.maxConcurrent &&
            this.isWithinRateLimit()
        ) {
            const request = this.queue.shift()!;
            this.executeRequest(request);
        }
    }

    private async executeRequest<T>(request: QueuedRequest<T>) {
        this.activeCount++;
        this.recordRequest();

        try {
            const result = await this.withTimeout(
                request.execute(),
                this.config.timeoutMs
            );
            request.resolve(result);
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));

            if (this.shouldRetry(err, request.retries)) {
                const delay = this.getRetryDelay(request.retries);
                console.warn(
                    `[aiRequestManager] Retry ${request.retries + 1}/${this.config.maxRetries} for ${request.feature} in ${delay}ms:`,
                    err.message
                );
                request.retries++;

                // Re-enqueue after delay
                setTimeout(() => {
                    this.queue.unshift(request);
                    this.drain();
                }, delay);
            } else {
                request.reject(err);
            }
        } finally {
            this.activeCount--;
            this.drain();
        }
    }

    private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(
                () => reject(new Error(`AI request timed out after ${ms}ms`)),
                ms
            );

            promise
                .then((val) => {
                    clearTimeout(timer);
                    resolve(val);
                })
                .catch((err) => {
                    clearTimeout(timer);
                    reject(err);
                });
        });
    }

    private shouldRetry(error: Error, currentRetries: number): boolean {
        if (currentRetries >= this.config.maxRetries) return false;

        const message = error.message.toLowerCase();

        // Retry on timeouts, rate limits, and transient server errors
        if (message.includes('timed out')) return true;
        if (message.includes('rate limit') || message.includes('429')) return true;
        if (message.includes('503') || message.includes('502')) return true;
        if (message.includes('network') || message.includes('fetch failed')) return true;

        // Don't retry on auth errors, bad requests, or parsing failures
        if (message.includes('401') || message.includes('403')) return false;
        if (message.includes('not configured')) return false;
        if (message.includes('parse')) return false;

        // Default: retry once for unknown errors
        return currentRetries < 1;
    }

    private getRetryDelay(retryCount: number): number {
        // Exponential backoff: 1s, 2s, 4s... with jitter
        const base = this.config.baseRetryDelayMs * Math.pow(2, retryCount);
        const jitter = Math.random() * 500;
        return base + jitter;
    }

    private isWithinRateLimit(): boolean {
        return this.getRecentRequestCount() < this.config.maxRequestsPerMinute;
    }

    private getRecentRequestCount(): number {
        return this.getRequestCountSince(ONE_MINUTE_MS);
    }

    private getRequestCountSince(windowMs: number): number {
        // Prune the buffer based on the longest window we care about so it
        // doesn't grow unbounded. Monthly is the largest here.
        const maxWindowCutoff = Date.now() - ONE_MONTH_MS;
        this.requestTimestamps = this.requestTimestamps.filter(
            (ts) => ts > maxWindowCutoff
        );
        const cutoff = Date.now() - windowMs;
        return this.requestTimestamps.filter((ts) => ts > cutoff).length;
    }

    private recordRequest() {
        this.requestTimestamps.push(Date.now());
    }
}

/** Singleton instance for all AI requests */
export const aiRequestManager = new AIRequestManager();

/**
 * Convenience wrapper: execute an AI call through the managed queue.
 */
export function managedAIRequest<T>(
    execute: () => Promise<T>,
    feature: string
): Promise<T> {
    return aiRequestManager.enqueue(execute, feature);
}
