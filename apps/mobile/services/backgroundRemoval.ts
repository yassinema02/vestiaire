/**
 * Background Removal Service
 * Uses Gemini 2.5 Flash Image to remove backgrounds from clothing photos
 */

import Constants from 'expo-constants';
import { decode } from 'base64-arraybuffer';
import { BACKGROUND_REMOVAL_PROMPT } from '../constants/prompts';
import { trackedGenerateContent } from './aiUsageLogger';
import { optimizeForAI } from './imageOptimizer';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';

export interface BackgroundRemovalResult {
    processedImageBase64: string | null;
    error: Error | null;
}

/**
 * Check if background removal is configured
 */
export const isBackgroundRemovalConfigured = (): boolean => {
    return !!GEMINI_API_KEY && GEMINI_API_KEY !== 'your_api_key_here';
};

/**
 * Convert blob to base64 string (React Native compatible)
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            // Remove the data URL prefix (e.g., "data:image/png;base64,")
            const base64 = base64data.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Remove background from an image using Gemini 2.5 Flash Image
 * @param imageUrl - Public URL of the image to process
 * @returns Processed image as base64 or error
 */
export const removeBackground = async (
    imageUrl: string
): Promise<BackgroundRemovalResult> => {
    if (!isBackgroundRemovalConfigured()) {
        console.warn('Background removal not configured - missing Gemini API key');
        return {
            processedImageBase64: null,
            error: new Error('Background removal not configured'),
        };
    }

    try {
        console.log('Starting background removal with Gemini');

        // Optimize image for AI (512px, 85% JPEG)
        const optimizedUri = await optimizeForAI(imageUrl);

        // Fetch image and convert to base64
        const imageResponse = await fetch(optimizedUri);
        const imageBlob = await imageResponse.blob();
        const imageBase64 = await blobToBase64(imageBlob);

        const response = await trackedGenerateContent({
            model: 'gemini-2.5-flash-image',
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: BACKGROUND_REMOVAL_PROMPT,
                        },
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: imageBase64,
                            },
                        },
                    ],
                },
            ],
        }, 'bg_removal');

        // Extract image data from response
        const parts = response.candidates?.[0]?.content?.parts;
        if (!parts) {
            throw new Error('No response parts from Gemini');
        }

        const imagePart = parts.find((part: any) => part.inlineData);
        if (!imagePart?.inlineData?.data) {
            throw new Error('No image data in Gemini response');
        }

        const base64 = imagePart.inlineData.data;
        console.log('Background removal successful, base64 length:', base64.length);

        return { processedImageBase64: base64, error: null };
    } catch (error) {
        console.error('Background removal failed:', error);
        return { processedImageBase64: null, error: error as Error };
    }
};

export { decode };
