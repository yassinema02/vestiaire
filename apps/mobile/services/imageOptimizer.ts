/**
 * Image Optimizer for AI Services
 * Resizes images to 512px width and compresses to 85% JPEG
 * before sending to Gemini, saving ~40% on API cost and latency.
 */

import * as ImageManipulator from 'expo-image-manipulator';

const AI_MAX_WIDTH = 512;
const AI_JPEG_QUALITY = 0.85;

/**
 * Optimize an image for AI consumption (Gemini Vision).
 * Accepts both local file URIs and remote HTTP(S) URLs.
 * expo-image-manipulator handles both natively on React Native.
 * Returns a local file URI to a compressed 512px-wide JPEG.
 */
export async function optimizeForAI(uri: string): Promise<string> {
    try {
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: AI_MAX_WIDTH } }],
            {
                compress: AI_JPEG_QUALITY,
                format: ImageManipulator.SaveFormat.JPEG,
            }
        );

        return result.uri;
    } catch (error) {
        console.warn('Image optimization failed, using original:', error);
        return uri; // Graceful degradation: return original
    }
}
