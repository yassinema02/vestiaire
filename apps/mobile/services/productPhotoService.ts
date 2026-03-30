/**
 * Product Photo Generation Service
 * Uses Gemini 2.5 Flash Image to generate professional e-commerce product photos.
 * Calls the SDK directly (not through aiProxy) because image generation
 * requires responseModalities config that the shared proxy layer doesn't support.
 */

import { GoogleGenAI } from '@google/genai';
import { runtimeConfig, hasRuntimeValue } from './runtimeConfig';
import { PRODUCT_PHOTO_PROMPT } from '../constants/prompts';
import { optimizeForAI } from './imageOptimizer';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

export interface ProductPhotoResult {
    processedImageBase64: string | null;
    error: Error | null;
}

export interface ProductPhotoMetadata {
    category?: string;
    subCategory?: string;
    colors?: string[];
    pattern?: string;
}

export const isProductPhotoConfigured = (): boolean => {
    return hasRuntimeValue(runtimeConfig.geminiApiKey);
};

let genAIInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
    if (!genAIInstance) {
        genAIInstance = new GoogleGenAI({ apiKey: runtimeConfig.geminiApiKey });
    }
    return genAIInstance;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            const base64 = base64data.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

function buildPrompt(metadata?: ProductPhotoMetadata): string {
    const details: string[] = [];
    if (metadata?.category) {
        details.push(`- Category: ${metadata.category}${metadata.subCategory ? ` / ${metadata.subCategory}` : ''}`);
    }
    if (metadata?.colors?.length) {
        details.push(`- Colors: ${metadata.colors.join(', ')}`);
    }
    if (metadata?.pattern) {
        details.push(`- Pattern: ${metadata.pattern}`);
    }

    const itemDetails = details.length > 0
        ? details.join('\n')
        : '- (No metadata available — analyze the item from the image)';

    return PRODUCT_PHOTO_PROMPT.replace('{ITEM_DETAILS}', itemDetails);
}

/**
 * Generate a professional e-commerce product photo from a clothing item image
 * @param imageUrl - URL or local URI of the image to process
 * @param metadata - Optional categorization metadata to ground the prompt
 * @returns Processed image as base64 or error
 */
export const generateProductPhoto = async (
    imageUrl: string,
    metadata?: ProductPhotoMetadata
): Promise<ProductPhotoResult> => {
    if (!isProductPhotoConfigured()) {
        console.warn('Product photo generation not configured — missing Gemini API key');
        return { processedImageBase64: null, error: new Error('Product photo generation not configured') };
    }

    try {
        console.log('[ProductPhoto] Starting generation...');

        const optimizedUri = await optimizeForAI(imageUrl);
        const imageResponse = await fetchWithTimeout(optimizedUri, { timeout: 30_000 });
        const imageBlob = await imageResponse.blob();
        const imageBase64 = await blobToBase64(imageBlob);

        const genAI = getGenAI();

        // Try with full prompt first, then simplified prompt on IMAGE_OTHER
        const prompts = [
            buildPrompt(metadata),
            // Fallback: much simpler prompt that is less likely to trigger safety filters
            `Remove the background from this clothing photo and place the garment on a plain white background. Keep the item exactly as it is, do not modify it. Output only the resulting image.`,
        ];

        for (let attempt = 0; attempt < prompts.length; attempt++) {
            const prompt = prompts[attempt];
            console.log(`[ProductPhoto] Attempt ${attempt + 1}/${prompts.length}`);

            try {
                const response = await genAI.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: imageBase64,
                            },
                        },
                    ],
                    config: {
                        responseModalities: ['IMAGE', 'TEXT'],
                    },
                });

                const candidate = response.candidates?.[0] as any;
                const finishReason = candidate?.finishReason ?? 'unknown';
                const parts = candidate?.content?.parts;

                console.log(`[ProductPhoto] finishReason: ${finishReason}, parts: ${parts?.length ?? 0}`);

                // If blocked by safety filter, try next prompt
                if (!parts || parts.length === 0) {
                    console.warn(`[ProductPhoto] Attempt ${attempt + 1} blocked (${finishReason})`);
                    if (attempt < prompts.length - 1) continue;
                    // All attempts exhausted
                    console.warn('[ProductPhoto] All attempts blocked by Gemini safety filters. Skipping enhancement.');
                    return { processedImageBase64: null, error: null };
                }

                const imagePart = parts.find((part: any) => part.inlineData);
                if (!imagePart?.inlineData?.data) {
                    console.warn(`[ProductPhoto] Attempt ${attempt + 1}: no image in parts, trying next...`);
                    if (attempt < prompts.length - 1) continue;
                    console.warn('[ProductPhoto] No image data returned. Skipping enhancement.');
                    return { processedImageBase64: null, error: null };
                }

                const base64 = imagePart.inlineData.data;
                console.log(`[ProductPhoto] Success on attempt ${attempt + 1}, base64 length: ${base64.length}`);
                return { processedImageBase64: base64, error: null };
            } catch (innerError) {
                console.warn(`[ProductPhoto] Attempt ${attempt + 1} threw:`, innerError);
                if (attempt < prompts.length - 1) continue;
                throw innerError;
            }
        }

        // Should never reach here, but just in case
        return { processedImageBase64: null, error: null };
    } catch (error) {
        console.error('[ProductPhoto] Generation failed:', error);
        return { processedImageBase64: null, error: error as Error };
    }
};
