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

/**
 * Crop a region from an image using a normalized bounding box.
 * Gemini returns bounding boxes as [y1, x1, y2, x2] in 0-1000 coordinates.
 * We convert to pixel coordinates and crop using expo-image-manipulator.
 *
 * @param uri - Source image URI (local or remote)
 * @param boundingBox - [y1, x1, y2, x2] in 0-1000 normalized coords
 * @param padding - Extra padding ratio (0.05 = 5% on each side)
 * @returns Cropped image URI, or original URI on failure
 */
export async function cropFromBoundingBox(
    uri: string,
    boundingBox: [number, number, number, number],
    padding: number = 0.05
): Promise<string> {
    try {
        const [y1Norm, x1Norm, y2Norm, x2Norm] = boundingBox;

        // Get image dimensions via a no-op manipulate call
        const info = await ImageManipulator.manipulateAsync(uri, []);
        const imgW = info.width;
        const imgH = info.height;

        // Convert 0-1000 normalized coords to pixels
        let x1 = (x1Norm / 1000) * imgW;
        let y1 = (y1Norm / 1000) * imgH;
        let x2 = (x2Norm / 1000) * imgW;
        let y2 = (y2Norm / 1000) * imgH;

        // Add padding
        const padX = (x2 - x1) * padding;
        const padY = (y2 - y1) * padding;
        x1 = Math.max(0, x1 - padX);
        y1 = Math.max(0, y1 - padY);
        x2 = Math.min(imgW, x2 + padX);
        y2 = Math.min(imgH, y2 + padY);

        const cropW = Math.round(x2 - x1);
        const cropH = Math.round(y2 - y1);

        if (cropW < 20 || cropH < 20) {
            console.warn('[Crop] Bounding box too small, skipping crop');
            return uri;
        }

        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ crop: { originX: Math.round(x1), originY: Math.round(y1), width: cropW, height: cropH } }],
            { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
        );

        return result.uri;
    } catch (error) {
        console.warn('[Crop] Failed to crop image, using original:', error);
        return uri;
    }
}
