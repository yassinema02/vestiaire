/**
 * Image Optimizer for AI Services
 * Resizes images and compresses to JPEG before sending to Gemini,
 * saving on API cost and latency.
 *
 * Supports adaptive resolution based on item complexity:
 * - simple (512px): basic items like solid-color t-shirts
 * - medium (768px): items with patterns, textures, or worn on a person
 * - complex (1024px): mirror selfies, lifestyle shots, highly detailed items
 */

import * as ImageManipulator from 'expo-image-manipulator';

export type ImageComplexity = 'simple' | 'medium' | 'complex';

const WIDTH_MAP: Record<ImageComplexity, number> = {
    simple: 512,
    medium: 768,
    complex: 1024,
};

const QUALITY_MAP: Record<ImageComplexity, number> = {
    simple: 0.85,
    medium: 0.88,
    complex: 0.90,
};

/**
 * Optimize an image for AI consumption (Gemini Vision).
 * Accepts both local file URIs and remote HTTP(S) URLs.
 * expo-image-manipulator handles both natively on React Native.
 * Returns a local file URI to a compressed JPEG.
 *
 * @param uri - Local file URI or remote URL
 * @param complexity - Determines output resolution and quality
 */
export async function optimizeForAI(
    uri: string,
    complexity: ImageComplexity = 'simple'
): Promise<string> {
    try {
        const width = WIDTH_MAP[complexity];
        const quality = QUALITY_MAP[complexity];

        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width } }],
            {
                compress: quality,
                format: ImageManipulator.SaveFormat.JPEG,
            }
        );

        return result.uri;
    } catch (error) {
        console.warn('Image optimization failed, using original:', error);
        return uri; // Graceful degradation: return original
    }
}
