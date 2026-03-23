/**
 * AI Proxy Client
 * Calls Gemini API directly using @google/genai SDK.
 */

import { GoogleGenAI } from '@google/genai';
import { runtimeConfig } from './runtimeConfig';
import type { AIFeature } from './aiUsageLogger';
import { managedAIRequest } from './aiRequestManager';

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

let genAIInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
    if (!genAIInstance) {
        genAIInstance = new GoogleGenAI({ apiKey: runtimeConfig.geminiApiKey });
    }
    return genAIInstance;
}

/**
 * Call Gemini API directly with queue/timeout/retry management.
 */
export async function callGeminiProxy(
    params: AIProxyGenerateContentParams,
    feature: AIFeature
): Promise<AIProxyGenerateContentResponse> {
    return managedAIRequest(
        () => callGeminiDirect(params),
        feature
    );
}

/**
 * Direct Gemini API call via @google/genai SDK.
 */
async function callGeminiDirect(
    params: AIProxyGenerateContentParams
): Promise<AIProxyGenerateContentResponse> {
    const genAI = getGenAI();

    const isImageModel = params.model.includes('image');

    const response = await genAI.models.generateContent({
        model: params.model,
        contents: params.contents as any,
        ...(isImageModel && {
            config: { responseModalities: ['IMAGE', 'TEXT'] },
        }),
    });

    const text = response.text ?? null;
    const candidates = response.candidates as Array<Record<string, unknown>> | undefined;
    const usageMetadata = response.usageMetadata
        ? {
              promptTokenCount: response.usageMetadata.promptTokenCount ?? null,
              candidatesTokenCount: response.usageMetadata.candidatesTokenCount ?? null,
          }
        : null;

    return { text, candidates, usageMetadata };
}
