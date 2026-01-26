/**
 * Image Utility Functions
 * Handles image compression and manipulation
 */

import * as ImageManipulator from 'expo-image-manipulator';

const MAX_WIDTH = 1200;
const INITIAL_QUALITY = 0.7;

export interface ImageInfo {
    uri: string;
    width: number;
    height: number;
}

/**
 * Compress an image for upload
 * Resizes to max width and compresses to JPEG
 */
export const compressImage = async (uri: string): Promise<ImageInfo> => {
    try {
        // Resize and compress in one operation
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: MAX_WIDTH } }],
            {
                compress: INITIAL_QUALITY,
                format: ImageManipulator.SaveFormat.JPEG
            }
        );

        return {
            uri: result.uri,
            width: result.width,
            height: result.height,
        };
    } catch (error) {
        console.error('Compress error:', error);
        // Return original on failure
        return {
            uri,
            width: 0,
            height: 0,
        };
    }
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return 'Unknown size';
    if (bytes < 1024) {
        return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
};