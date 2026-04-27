/**
 * Fetch with timeout protection
 * Wraps fetch() with an AbortController that aborts after the specified timeout
 */

const DEFAULT_TIMEOUT = 15_000; // 15 seconds

export async function fetchWithTimeout(
    url: string,
    options?: RequestInit & { timeout?: number }
): Promise<Response> {
    const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options || {};
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(timer);
    }
}
