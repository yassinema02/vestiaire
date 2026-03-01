/**
 * AI Usage Logger
 * Wraps Gemini API calls to track usage, tokens, latency, and cost.
 * Logs are written to Supabase fire-and-forget (non-blocking).
 */

import Constants from 'expo-constants';
import { GoogleGenAI } from '@google/genai';
import { supabase } from './supabase';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';

// Feature names matching the database CHECK constraint
export type AIFeature =
    | 'categorization'
    | 'outfit_gen'
    | 'event_outfit_gen'
    | 'listing_gen'
    | 'bg_removal'
    | 'extraction'
    | 'steal_look'
    | 'event_classify'
    | 'gap_analysis'
    | 'shopping_analysis';

// Cost per million tokens (USD) by model
const COST_TABLE: Record<string, { input: number; output: number }> = {
    'gemini-2.0-flash': { input: 0.10, output: 0.40 },
    'gemini-2.5-flash-image': { input: 0.10, output: 0.40 },
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
};

function estimateCost(
    model: string,
    tokensInput: number | null,
    tokensOutput: number | null
): number | null {
    const rates = COST_TABLE[model];
    if (!rates || tokensInput == null || tokensOutput == null) return null;
    return (tokensInput * rates.input + tokensOutput * rates.output) / 1_000_000;
}

// Shared AI client singleton
let _aiClient: InstanceType<typeof GoogleGenAI> | null = null;

export function getAIClient(): InstanceType<typeof GoogleGenAI> {
    if (!_aiClient) {
        _aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    }
    return _aiClient;
}

/**
 * Tracked wrapper around ai.models.generateContent.
 * Records latency, token counts, cost, and success/failure.
 * Log insert is fire-and-forget — it never blocks or throws.
 */
export async function trackedGenerateContent(
    params: {
        model: string;
        contents: any;
    },
    feature: AIFeature,
    userId?: string | null
) {
    const startMs = Date.now();

    try {
        const ai = getAIClient();
        const result = await ai.models.generateContent(params);

        // Extract token metadata from response
        const usage = result.usageMetadata;
        const tokensInput = usage?.promptTokenCount ?? null;
        const tokensOutput = usage?.candidatesTokenCount ?? null;

        logUsage(feature, params.model, startMs, tokensInput, tokensOutput, true, null, userId);

        return result;
    } catch (err: any) {
        logUsage(feature, params.model, startMs, null, null, false, err?.message || 'Unknown error', userId);
        throw err;
    }
}

/**
 * Fire-and-forget log entry to Supabase.
 */
function logUsage(
    feature: AIFeature,
    model: string,
    startMs: number,
    tokensInput: number | null,
    tokensOutput: number | null,
    success: boolean,
    errorMessage: string | null,
    userId?: string | null
): void {
    const latencyMs = Date.now() - startMs;
    const costUsd = estimateCost(model, tokensInput, tokensOutput);

    // Fire and forget — do not await, do not block
    supabase
        .from('ai_usage_log')
        .insert({
            user_id: userId || null,
            feature,
            model_used: model,
            tokens_input: tokensInput,
            tokens_output: tokensOutput,
            latency_ms: latencyMs,
            cost_usd: costUsd,
            success,
            error_message: errorMessage,
        })
        .then(({ error }) => {
            if (error) console.warn('AI usage log insert failed:', error.message);
        });
}
