/**
 * Product Photo Generation Service
 * Uses Gemini 2.5 Flash Image to generate professional e-commerce product photos.
 * Calls the SDK directly (not through aiProxy) because image generation
 * requires responseModalities config that the shared proxy layer doesn't support.
 *
 * Enhancement strategy (Phase 1):
 * - Classifies photo complexity based on metadata heuristics
 * - Uses adaptive resolution (512/768/1024px) based on complexity
 * - Tries up to 3 prompts: primary → complex/segmentation → minimal fallback
 * - Logs failures with context for analytics
 */

import { GoogleGenAI } from '@google/genai';
import { runtimeConfig, hasRuntimeValue } from './runtimeConfig';
import { PRODUCT_PHOTO_PROMPT, PRODUCT_PHOTO_PROMPT_COMPLEX, PRODUCT_PHOTO_DESCRIBE_PROMPT, PRODUCT_PHOTO_GENERATE_FROM_DESC_PROMPT } from '../constants/prompts';
import { optimizeForAI, ImageComplexity } from './imageOptimizer';
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
    /** Where the item is positioned — e.g. "worn by person, upper body" */
    positionDescription?: string;
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

/**
 * Estimate image complexity from metadata heuristics.
 * This avoids a separate Gemini call — we use what we already know
 * from the AI categorization step.
 */
function estimateComplexity(metadata?: ProductPhotoMetadata): ImageComplexity {
    if (!metadata) return 'medium';

    const { subCategory, pattern, positionDescription } = metadata;
    const sub = (subCategory ?? '').toLowerCase();
    const pos = (positionDescription ?? '').toLowerCase();

    // Item worn by a person → complex (need describe-then-generate to isolate)
    if (pos.includes('worn') || pos.includes('mirror') || pos.includes('selfie') || pos.includes('lifestyle') || pos.includes('person')) {
        return 'complex';
    }

    // Textured / complex garments → medium-to-complex
    const complexItems = [
        'coat', 'jacket', 'blazer', 'parka', 'vest', 'cardigan',
        'fur', 'shearling', 'leather', 'suit', 'dress', 'gown',
    ];
    if (complexItems.some(item => sub.includes(item))) {
        return 'complex';
    }

    // Patterned items → medium
    if (pattern && pattern !== 'solid') {
        return 'medium';
    }

    // Simple items: t-shirt, tank-top, etc. → simple
    const simpleItems = ['t-shirt', 'tank', 'polo', 'shorts', 'socks', 'cap', 'hat', 'beanie'];
    if (simpleItems.some(item => sub.includes(item))) {
        return 'simple';
    }

    return 'medium';
}

function buildPrompt(template: string, metadata?: ProductPhotoMetadata): string {
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
    if (metadata?.positionDescription) {
        details.push(`- Position in photo: ${metadata.positionDescription}`);
        details.push(`- IMPORTANT: This photo may contain MULTIPLE clothing items. Extract ONLY the ${metadata.subCategory || metadata.category || 'item'} described above, ignore all other garments.`);
    }

    const itemDetails = details.length > 0
        ? details.join('\n')
        : '- (No metadata available — analyze the item from the image)';

    return template.replace('{ITEM_DETAILS}', itemDetails);
}

/**
 * Generate a professional e-commerce product photo from a clothing item image.
 *
 * Strategy:
 * 1. Estimate complexity from metadata → set resolution accordingly
 * 2. Try primary prompt (generation-style)
 * 3. If blocked/empty → try complex prompt (segmentation-style)
 * 4. If still blocked → try minimal fallback prompt
 * 5. If all fail → return null gracefully (original photo kept)
 *
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
        const complexity = estimateComplexity(metadata);
        console.log(`[ProductPhoto] Starting generation (complexity: ${complexity})...`);

        const optimizedUri = await optimizeForAI(imageUrl, complexity);
        const imageResponse = await fetchWithTimeout(optimizedUri, { timeout: 30_000 });
        const imageBlob = await imageResponse.blob();
        const imageBase64 = await blobToBase64(imageBlob);

        const genAI = getGenAI();

        // For complex items (jackets on people, mirror selfies), skip extraction entirely
        // and go straight to describe-then-generate — extraction just removes the background
        // but keeps the person, which isn't what we want.
        if (complexity === 'complex') {
            console.log('[ProductPhoto] Complex item detected — using describe-then-generate as primary strategy');
            const generated = await describeAndGenerate(imageBase64, metadata);
            if (generated) {
                console.log('[ProductPhoto] Describe-then-generate succeeded for complex item');
                return { processedImageBase64: generated, error: null };
            }
            console.log('[ProductPhoto] Describe-then-generate failed — falling back to extraction prompts');
        }

        // Build prompt sequence for extraction attempts
        const prompts: string[] = [];

        if (complexity === 'complex') {
            // Complex items that failed describe-then-generate: try segmentation
            prompts.push(buildPrompt(PRODUCT_PHOTO_PROMPT_COMPLEX, metadata));
            prompts.push(buildPrompt(PRODUCT_PHOTO_PROMPT, metadata));
        } else {
            // For simple/medium, lead with generation prompt (better quality)
            prompts.push(buildPrompt(PRODUCT_PHOTO_PROMPT, metadata));
            prompts.push(buildPrompt(PRODUCT_PHOTO_PROMPT_COMPLEX, metadata));
        }

        // Final fallback: ultra-minimal prompt
        prompts.push(
            `Remove the background from this clothing photo and place the garment on a plain white background. Keep the item exactly as it is, do not modify it. Output only the resulting image.`
        );

        for (let attempt = 0; attempt < prompts.length; attempt++) {
            const prompt = prompts[attempt];
            const promptLabel = attempt === 0 ? 'primary' : attempt === 1 ? 'secondary' : 'fallback';
            console.log(`[ProductPhoto] Attempt ${attempt + 1}/${prompts.length} (${promptLabel})`);

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
                    // All extraction attempts exhausted — try describe-then-generate for complex items
                    if (complexity === 'complex') {
                        console.log('[ProductPhoto] All extraction attempts failed. Trying describe-then-generate...');
                        const generated = await describeAndGenerate(imageBase64, metadata);
                        if (generated) return { processedImageBase64: generated, error: null };
                    }
                    console.warn('[ProductPhoto] All attempts failed. Skipping enhancement.');
                    logEnhancementFailure('all_blocked', metadata, complexity);
                    return { processedImageBase64: null, error: null };
                }

                const imagePart = parts.find((part: any) => part.inlineData);
                if (!imagePart?.inlineData?.data) {
                    console.warn(`[ProductPhoto] Attempt ${attempt + 1}: no image in parts, trying next...`);
                    if (attempt < prompts.length - 1) continue;
                    // All extraction attempts exhausted — try describe-then-generate for complex items
                    if (complexity === 'complex') {
                        console.log('[ProductPhoto] All extraction attempts failed. Trying describe-then-generate...');
                        const generated = await describeAndGenerate(imageBase64, metadata);
                        if (generated) return { processedImageBase64: generated, error: null };
                    }
                    console.warn('[ProductPhoto] No image data returned. Skipping enhancement.');
                    logEnhancementFailure('no_image_data', metadata, complexity);
                    return { processedImageBase64: null, error: null };
                }

                const base64 = imagePart.inlineData.data;
                console.log(`[ProductPhoto] Success on attempt ${attempt + 1} (${promptLabel}), base64 length: ${base64.length}`);
                return { processedImageBase64: base64, error: null };
            } catch (innerError) {
                console.warn(`[ProductPhoto] Attempt ${attempt + 1} threw:`, innerError);
                if (attempt < prompts.length - 1) continue;
                // Last extraction attempt threw — try describe-then-generate for complex items
                if (complexity === 'complex') {
                    console.log('[ProductPhoto] All extraction attempts threw. Trying describe-then-generate...');
                    const generated = await describeAndGenerate(imageBase64, metadata);
                    if (generated) return { processedImageBase64: generated, error: null };
                }
                throw innerError;
            }
        }

        // Should never reach here, but just in case
        return { processedImageBase64: null, error: null };
    } catch (error) {
        console.error('[ProductPhoto] Generation failed:', error);
        logEnhancementFailure('exception', metadata, estimateComplexity(metadata));
        return { processedImageBase64: null, error: error as Error };
    }
};

/**
 * Describe-then-generate: for complex items where extraction fails.
 * Step 1: Ask Gemini to describe the garment from the source photo (text only)
 * Step 2: Generate a product photo from that description (no source image)
 * This sidesteps segmentation entirely — works for mirror selfies, complex outerwear, etc.
 */
async function describeAndGenerate(
    imageBase64: string,
    metadata?: ProductPhotoMetadata
): Promise<string | null> {
    const genAI = getGenAI();

    // Step 1: Describe the item from the photo
    console.log('[ProductPhoto] Describe-then-generate: Step 1 — describing item...');
    const describePrompt = buildPrompt(PRODUCT_PHOTO_DESCRIBE_PROMPT, metadata);
    try {
        const descResponse = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { text: describePrompt },
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
            ],
        });

        const description = descResponse.text?.trim();
        if (!description || description.length < 20) {
            console.warn('[ProductPhoto] Describe step returned empty/short response');
            return null;
        }
        console.log(`[ProductPhoto] Description (${description.length} chars): ${description.substring(0, 100)}...`);

        // Step 2: Generate product photo from description alone (no source image)
        console.log('[ProductPhoto] Describe-then-generate: Step 2 — generating from description...');
        const generatePrompt = PRODUCT_PHOTO_GENERATE_FROM_DESC_PROMPT.replace('{DESCRIPTION}', description);

        const genResponse = await genAI.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: [{ text: generatePrompt }],
            config: { responseModalities: ['IMAGE', 'TEXT'] },
        });

        const candidate = genResponse.candidates?.[0] as any;
        const parts = candidate?.content?.parts;
        const imagePart = parts?.find((part: any) => part.inlineData);

        if (!imagePart?.inlineData?.data) {
            console.warn('[ProductPhoto] Describe-then-generate: no image returned in step 2');
            return null;
        }

        console.log(`[ProductPhoto] Describe-then-generate: success! base64 length: ${imagePart.inlineData.data.length}`);
        return imagePart.inlineData.data;
    } catch (err) {
        console.warn('[ProductPhoto] Describe-then-generate failed:', err);
        return null;
    }
}

/**
 * Log enhancement failure details for analytics.
 * Structured logs make it easy to track success/failure rates by complexity.
 */
function logEnhancementFailure(
    reason: string,
    metadata?: ProductPhotoMetadata,
    complexity?: ImageComplexity
): void {
    console.warn(`[ProductPhoto:FAIL] reason=${reason} complexity=${complexity ?? 'unknown'} category=${metadata?.category ?? '?'} subCategory=${metadata?.subCategory ?? '?'} pattern=${metadata?.pattern ?? '?'}`);
}
