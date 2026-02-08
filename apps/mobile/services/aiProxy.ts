/**
 * AI Proxy Client
 * Routes AI API calls through Supabase Edge Functions to keep API keys server-side.
 */

import { supabase } from './supabase';

/**
 * Call Gemini AI through the server-side proxy.
 * @param prompt - The text prompt
 * @param imageBase64 - Optional base64-encoded image data
 * @returns The AI response text
 */
export async function callGeminiProxy(prompt: string, imageBase64?: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: { prompt, image: imageBase64 },
    });

    if (error) throw new Error(error.message || 'AI proxy request failed');
    if (!data?.text) throw new Error('No response from AI');
    return data.text;
}

/**
 * Call Remove.bg through the server-side proxy.
 * @param imageUrl - Public URL of the image to process
 * @returns Base64-encoded processed image
 */
export async function callRemoveBgProxy(imageUrl: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('remove-bg', {
        body: { image_url: imageUrl },
    });

    if (error) throw new Error(error.message || 'Remove.bg proxy request failed');
    if (!data?.base64) throw new Error('No image data from Remove.bg');
    return data.base64;
}
