/**
 * AI Proxy Client
 * Routes AI API calls through Supabase Edge Functions to keep API keys server-side.
 */

import { supabase } from './supabase';
import type { AIFeature } from './aiUsageLogger';

export interface AIProxyGenerateContentParams {
    model: string;
    contents: unknown;
}

export interface AIProxyGenerateContentResponse {
    text: string | null;
    candidates?: Array<Record<string, unknown>>;
    usageMetadata?: {
        promptTokenCount?: number | null;
        candidatesTokenCount?: number | null;
    } | null;
}

/**
 * Invoke the server-side AI proxy with a Gemini generateContent payload.
 */
export async function callGeminiProxy(
    params: AIProxyGenerateContentParams,
    feature: AIFeature
): Promise<AIProxyGenerateContentResponse> {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: {
            feature,
            model: params.model,
            contents: params.contents,
        },
    });

    if (error) {
        // Log full error details for debugging
        console.error('[aiProxy] Edge Function error:', {
            message: error.message,
            name: error.name,
            context: (error as any).context,
            status: (error as any).status,
            data,
        });
        throw new Error(data?.detail || data?.error || error.message || 'AI proxy request failed');
    }
    if (!data) throw new Error('No response from AI proxy');
    return data as AIProxyGenerateContentResponse;
}
