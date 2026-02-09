/**
 * Background Removal Service
 * Integrates with remove.bg API for automatic background removal
 */

import Constants from 'expo-constants';
import { decode } from 'base64-arraybuffer';

const REMOVE_BG_API_KEY = Constants.expoConfig?.extra?.removeBgApiKey || '';
const REMOVE_BG_URL = 'https://api.remove.bg/v1.0/removebg';

export interface BackgroundRemovalResult {
    processedImageBase64: string | null;
    error: Error | null;
}

/**
 * Check if background removal is configured
 */
export const isBackgroundRemovalConfigured = (): boolean => {
    return !!REMOVE_BG_API_KEY && REMOVE_BG_API_KEY !== 'your_api_key_here';
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
 * Remove background from an image using remove.bg API
 * @param imageUrl - Public URL of the image to process
 * @returns Processed image as base64 or error
 */
export const removeBackground = async (
    imageUrl: string
): Promise<BackgroundRemovalResult> => {
    if (!isBackgroundRemovalConfigured()) {
        console.warn('Background removal not configured - missing API key');
        return {
            processedImageBase64: null,
            error: new Error('Background removal not configured')
        };
    }

    try {
        console.log('Starting background removal for:', imageUrl);

        const formData = new FormData();
        formData.append('image_url', imageUrl);
        formData.append('size', 'auto');
        formData.append('format', 'png');
        formData.append('type', 'product'); // Optimized for product photos

        const response = await fetch(REMOVE_BG_URL, {
            method: 'POST',
            headers: {
                'X-Api-Key': REMOVE_BG_API_KEY,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Remove.bg API error:', response.status, errorText);
            throw new Error(`Remove.bg error: ${response.status} - ${errorText}`);
        }

        const blob = await response.blob();
        console.log('Background removal successful, blob size:', blob.size);

        // Convert blob to base64 for reliable upload
        const base64 = await blobToBase64(blob);
        console.log('Converted to base64, length:', base64.length);

        return { processedImageBase64: base64, error: null };
    } catch (error) {
        console.error('Background removal failed:', error);
        return { processedImageBase64: null, error: error as Error };
    }
};

export { decode };
