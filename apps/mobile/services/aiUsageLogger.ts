/**
 * AI Usage Client
 * Invokes server-side AI functions so provider keys and usage logging remain off-device.
 */

import { runtimeConfig, hasRuntimeValue } from './runtimeConfig';
import { callGeminiProxy } from './aiProxy';

export type AIFeature =
    | 'categorization'
    | 'outfit_gen'
    | 'event_outfit_gen'
    | 'listing_gen'
    | 'product_photo'
    | 'extraction'
    | 'steal_look'
    | 'event_classify'
    | 'gap_analysis'
    | 'shopping_analysis';

export interface TrackedGenerateContentResult {
    text: string | null;
    candidates?: Array<Record<string, unknown>>;
    usageMetadata?: {
        promptTokenCount?: number | null;
        candidatesTokenCount?: number | null;
    } | null;
}

export function isGeminiConfigured(): boolean {
    return hasRuntimeValue(runtimeConfig.geminiApiKey);
}

/**
 * Proxy AI generateContent requests to the server-side Edge Function.
 * Provider access, token accounting, and usage logging live on the server.
 */
export async function trackedGenerateContent(
    params: {
        model: string;
        contents: any;
    },
    feature: AIFeature,
    userId?: string | null
): Promise<TrackedGenerateContentResult> {
    if (!isGeminiConfigured()) {
        throw new Error('AI proxy not configured');
    }

    return callGeminiProxy(params, feature);
}
