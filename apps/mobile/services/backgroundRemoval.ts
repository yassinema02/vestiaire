/**
 * Background Removal Service
 * Routes requests through Edge Function proxy to keep API key server-side.
 */

import { decode } from 'base64-arraybuffer';
import { callRemoveBgProxy } from './aiProxy';

export interface BackgroundRemovalResult {
    processedImageBase64: string | null;
    error: Error | null;
}

/**
 * Check if background removal is configured.
 * Always true — configuration is now server-side (Edge Function).
 */
export const isBackgroundRemovalConfigured = (): boolean => {
    return true;
};

/**
 * Remove background from an image via the Edge Function proxy.
 * @param imageUrl - Public URL of the image to process
 * @returns Processed image as base64 or error
 */
export const removeBackground = async (
    imageUrl: string
): Promise<BackgroundRemovalResult> => {
    try {
        const base64 = await callRemoveBgProxy(imageUrl);
        return { processedImageBase64: base64, error: null };
    } catch (error) {
        console.error('Background removal failed:', error);
        return { processedImageBase64: null, error: error as Error };
    }
};

export { decode };
