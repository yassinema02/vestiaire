/**
 * Product Photo Generation Service
 * Uses Gemini 2.5 Flash Image to generate professional e-commerce product photos
 */

import { PRODUCT_PHOTO_PROMPT } from '../constants/prompts';
import { trackedGenerateContent, isGeminiConfigured } from './aiUsageLogger';
import { optimizeForAI } from './imageOptimizer';

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
    return isGeminiConfigured();
};

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
        console.warn('Product photo generation not configured — missing AI proxy configuration');
        return { processedImageBase64: null, error: new Error('Product photo generation not configured') };
    }

    try {
        console.log('Starting product photo generation with Gemini');

        const optimizedUri = await optimizeForAI(imageUrl);
        const imageResponse = await fetch(optimizedUri);
        const imageBlob = await imageResponse.blob();
        const imageBase64 = await blobToBase64(imageBlob);

        const prompt = buildPrompt(metadata);

        const response = await trackedGenerateContent({
            model: 'gemini-2.5-flash-image',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: imageBase64,
                            },
                        },
                    ],
                },
            ],
        }, 'product_photo');

        const parts = (response.candidates?.[0] as any)?.content?.parts as Array<any> | undefined;
        if (!parts) {
            throw new Error('No response parts from Gemini');
        }

        const imagePart = parts.find((part: any) => part.inlineData);
        if (!imagePart?.inlineData?.data) {
            throw new Error('No image data in Gemini response');
        }

        const base64 = imagePart.inlineData.data;
        console.log('Product photo generation successful, base64 length:', base64.length);

        return { processedImageBase64: base64, error: null };
    } catch (error) {
        console.error('Product photo generation failed:', error);
        return { processedImageBase64: null, error: error as Error };
    }
};
