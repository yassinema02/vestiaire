/**
 * Batch Product Photo Service
 * Processes extracted items through product photo generation pipeline
 * Story 10.3: Product Photo Generation for Extracted Items
 *
 * Reuses existing generateProductPhoto() from productPhotoService.ts
 * and uploadProcessedImage() from storage.ts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateProductPhoto } from './productPhotoService';
import { storageService } from './storage';
import { requireUserId } from './auth-helpers';
import { extractionService } from './extractionService';
import { cropFromBoundingBox } from './imageOptimizer';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import {
  ExtractionJob,
  DetectedItem,
  ProcessedDetectedItem,
  PhotoGenProgress,
  ExtractionJobResult,
} from '../types/extraction';

const LOW_CONFIDENCE_THRESHOLD = 50;
const USAGE_KEY_PREFIX = 'product_photo_usage_';

function getMonthlyUsageKey(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${USAGE_KEY_PREFIX}${yyyy}-${mm}`;
}

export const batchProductPhotoService = {
  /**
   * Process all detected items from a job through product photo generation
   */
  processExtractedItems: async (
    job: ExtractionJob,
    onProgress: (progress: PhotoGenProgress) => void
  ): Promise<ProcessedDetectedItem[]> => {
    if (!job.detected_items) return [];

    const result = job.detected_items as ExtractionJobResult;
    const allItems = extractionService.flattenDetectedItems(result);

    if (allItems.length === 0) return [];

    let userId: string;
    try {
      userId = await requireUserId();
    } catch {
      // If not authenticated, skip photo generation
      return allItems.map((item) => ({
        ...item,
        photo_gen_status: 'skipped' as const,
      }));
    }

    const processedItems: ProcessedDetectedItem[] = [];
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < allItems.length; i++) {
      onProgress({ processed: i, total: allItems.length, succeeded, failed });

      const item = allItems[i];

      // Skip low-confidence items
      if (item.confidence < LOW_CONFIDENCE_THRESHOLD) {
        processedItems.push({ ...item, photo_gen_status: 'skipped' });
        continue;
      }

      // Step 1: Crop item from photo if bounding box available
      let sourceUrl = item.photo_url;
      let croppedUrl: string | undefined;

      if (item.bounding_box) {
        try {
          const croppedLocalUri = await cropFromBoundingBox(item.photo_url, item.bounding_box);
          if (croppedLocalUri !== item.photo_url) {
            sourceUrl = croppedLocalUri;
            // Upload cropped image to Supabase so it persists
            const cropResponse = await fetchWithTimeout(croppedLocalUri, { timeout: 10_000 });
            const cropBlob = await cropResponse.blob();
            const cropBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
              reader.onerror = reject;
              reader.readAsDataURL(cropBlob);
            });
            const { url: cropSupabaseUrl } = await storageService.uploadProcessedImage(userId, cropBase64);
            if (cropSupabaseUrl) {
              croppedUrl = cropSupabaseUrl;
              console.log(`[Product Photo] Cropped & uploaded item ${i} (${item.sub_category})`);
            }
          }
        } catch (cropErr: any) {
          console.warn(`[Product Photo] Crop failed for item ${i}, using original:`, cropErr.message);
        }
      }

      try {
        // Step 2: Generate product photo from cropped (or original) image
        const { processedImageBase64, error: genError } = await generateProductPhoto(
          sourceUrl,
          {
            category: item.category?.toLowerCase(),
            subCategory: item.sub_category,
            colors: item.colors,
            pattern: (item as any).pattern,
            positionDescription: item.position_description,
          }
        );

        if (genError || !processedImageBase64) {
          throw genError || new Error('No processed image data');
        }

        // Step 3: Upload processed image to wardrobe-images bucket
        const { url, error: uploadError } = await storageService.uploadProcessedImage(
          userId,
          processedImageBase64
        );

        if (uploadError || !url) {
          throw uploadError || new Error('Failed to upload processed image');
        }

        processedItems.push({
          ...item,
          processed_image_url: url,
          cropped_image_url: croppedUrl,
          photo_gen_status: 'success',
        });
        succeeded++;
      } catch (err: any) {
        console.warn(`Product photo generation failed for item ${i} (${item.sub_category}):`, err.message);
        // Fallback: use cropped image if available, otherwise original
        processedItems.push({
          ...item,
          cropped_image_url: croppedUrl,
          photo_gen_status: 'failed',
        });
        failed++;
      }
    }

    // Final progress
    onProgress({
      processed: allItems.length,
      total: allItems.length,
      succeeded,
      failed,
    });

    // Cost tracking
    await batchProductPhotoService.trackUsage(succeeded);

    console.log(
      `[Product Photo] Processed ${allItems.length} items: ${succeeded} success, ${failed} failed, ${allItems.length - succeeded - failed} skipped`
    );

    return processedItems;
  },

  /**
   * Track monthly product photo generation usage in AsyncStorage
   */
  trackUsage: async (count: number): Promise<void> => {
    if (count === 0) return;
    try {
      const key = getMonthlyUsageKey();
      const current = await AsyncStorage.getItem(key);
      const total = (current ? parseInt(current, 10) : 0) + count;
      await AsyncStorage.setItem(key, String(total));
      console.log(`[Product Photo] Monthly usage: ${total}`);
    } catch (err) {
      console.warn('Failed to track product photo usage:', err);
    }
  },

  /**
   * Get current monthly usage count
   */
  getMonthlyUsage: async (): Promise<number> => {
    try {
      const key = getMonthlyUsageKey();
      const value = await AsyncStorage.getItem(key);
      return value ? parseInt(value, 10) : 0;
    } catch {
      return 0;
    }
  },

  /**
   * Estimated processing time for product photo generation
   */
  getEstimatedTime: (itemCount: number): string => {
    const seconds = itemCount * 4; // ~4 seconds per item
    const minutes = Math.ceil(seconds / 60);
    return `~${minutes} minute${minutes !== 1 ? 's' : ''}`;
  },
};
