/**
 * Storage Service
 * Handles image uploads to Supabase Storage
 */

import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

const BUCKET_NAME = 'wardrobe-images';

export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

export interface UploadResult {
    url: string | null;
    path: string | null;
    error: Error | null;
}

export const storageService = {
    /**
     * Upload an image to Supabase Storage
     */
    uploadImage: async (
        userId: string,
        imageUri: string,
        onProgress?: (progress: UploadProgress) => void
    ): Promise<UploadResult> => {
        try {
            // Generate unique filename
            const timestamp = Date.now();
            const filename = `${userId}/${timestamp}.jpg`;

            // Simulate progress start
            onProgress?.({ loaded: 0, total: 100, percentage: 0 });

            // Fetch the image as blob
            const response = await fetch(imageUri);
            const blob = await response.blob();

            // Convert blob to ArrayBuffer for proper upload
            const arrayBuffer = await new Response(blob).arrayBuffer();

            // Upload using ArrayBuffer (more reliable than blob)
            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filename, arrayBuffer, {
                    contentType: 'image/jpeg',
                    upsert: false,
                });

            if (error) {
                console.error('Upload error:', error);
                return { url: null, path: null, error };
            }

            // Simulate progress complete
            onProgress?.({ loaded: 100, total: 100, percentage: 100 });

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(data.path);

            console.log('Upload success, URL:', urlData.publicUrl);

            return {
                url: urlData.publicUrl,
                path: data.path,
                error: null,
            };
        } catch (error) {
            console.error('Upload exception:', error);
            return {
                url: null,
                path: null,
                error: error as Error,
            };
        }
    },

    /**
     * Delete an image from storage
     */
    deleteImage: async (path: string): Promise<{ error: Error | null }> => {
        try {
            const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);
            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    },

    /**
     * Get signed URL for private access (if bucket is private)
     */
    getSignedUrl: async (
        path: string,
        expiresIn: number = 3600
    ): Promise<{ url: string | null; error: Error | null }> => {
        try {
            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .createSignedUrl(path, expiresIn);

            if (error) return { url: null, error };
            return { url: data.signedUrl, error: null };
        } catch (error) {
            return { url: null, error: error as Error };
        }
    },

    /**
     * Upload a processed image from base64 (PNG with transparent background)
     */
    uploadProcessedImage: async (
        userId: string,
        base64Data: string
    ): Promise<UploadResult> => {
        try {
            // Generate unique filename for processed image
            const timestamp = Date.now();
            const filename = `${userId}/processed_${timestamp}.png`;

            // Convert base64 to ArrayBuffer
            const arrayBuffer = decode(base64Data);

            // Upload to Supabase
            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filename, arrayBuffer, {
                    contentType: 'image/png',
                    upsert: false,
                });

            if (error) {
                console.error('Processed upload error:', error);
                return { url: null, path: null, error };
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(data.path);

            console.log('Processed upload success, URL:', urlData.publicUrl);

            return {
                url: urlData.publicUrl,
                path: data.path,
                error: null,
            };
        } catch (error) {
            console.error('Processed upload exception:', error);
            return {
                url: null,
                path: null,
                error: error as Error,
            };
        }
    },
};
