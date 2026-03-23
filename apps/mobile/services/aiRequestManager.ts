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
}

const DEFAULT_CONFIG: RequestManagerConfig = {
    maxConcurrent: 3,
    timeoutMs: 60_000,
    maxRetries: 2,
    baseRetryDelayMs: 1_000,
    maxRequestsPerMinute: 30,
};

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
        const oneMinuteAgo = Date.now() - 60_000;
        this.requestTimestamps = this.requestTimestamps.filter(
            (ts) => ts > oneMinuteAgo
        );
        return this.requestTimestamps.length;
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
