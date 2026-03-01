/**
 * Batch Background Removal Service
 * Processes extracted items through bg removal pipeline
 * Story 10.3: Background Removal for Extracted Items
 *
 * Reuses existing removeBackground() from backgroundRemoval.ts
 * and uploadProcessedImage() from storage.ts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { removeBackground, isBackgroundRemovalConfigured } from './backgroundRemoval';
import { storageService } from './storage';
import { requireUserId } from './auth-helpers';
import { extractionService } from './extractionService';
import {
  ExtractionJob,
  DetectedItem,
  ProcessedDetectedItem,
  BgRemovalProgress,
  ExtractionJobResult,
} from '../types/extraction';

const LOW_CONFIDENCE_THRESHOLD = 50;
const USAGE_KEY_PREFIX = 'bg_removal_usage_';

function getMonthlyUsageKey(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${USAGE_KEY_PREFIX}${yyyy}-${mm}`;
}

export const batchBgRemovalService = {
  /**
   * Process all detected items from a job through background removal
   */
  processExtractedItems: async (
    job: ExtractionJob,
    onProgress: (progress: BgRemovalProgress) => void
  ): Promise<ProcessedDetectedItem[]> => {
    if (!job.detected_items) return [];

    const result = job.detected_items as ExtractionJobResult;
    const allItems = extractionService.flattenDetectedItems(result);

    if (allItems.length === 0) return [];

    const bgConfigured = isBackgroundRemovalConfigured();
    let userId: string;
    try {
      userId = await requireUserId();
    } catch {
      // If not authenticated, skip bg removal
      return allItems.map((item) => ({
        ...item,
        bg_removal_status: 'skipped' as const,
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
        processedItems.push({ ...item, bg_removal_status: 'skipped' });
        continue;
      }

      // Skip if bg removal not configured
      if (!bgConfigured) {
        processedItems.push({ ...item, bg_removal_status: 'skipped' });
        continue;
      }

      try {
        // 1. Remove background using existing Gemini service
        const { processedImageBase64, error: bgError } = await removeBackground(item.photo_url);

        if (bgError || !processedImageBase64) {
          throw bgError || new Error('No processed image data');
        }

        // 2. Upload processed image to wardrobe-images bucket
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
          bg_removal_status: 'success',
        });
        succeeded++;
      } catch (err: any) {
        console.warn(`Bg removal failed for item ${i} (${item.sub_category}):`, err.message);
        // Fallback: keep original photo URL
        processedItems.push({
          ...item,
          bg_removal_status: 'failed',
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
    await batchBgRemovalService.trackUsage(succeeded);

    console.log(
      `[BG Removal] Processed ${allItems.length} items: ${succeeded} success, ${failed} failed, ${allItems.length - succeeded - failed} skipped`
    );

    return processedItems;
  },

  /**
   * Track monthly bg removal usage in AsyncStorage
   */
  trackUsage: async (count: number): Promise<void> => {
    if (count === 0) return;
    try {
      const key = getMonthlyUsageKey();
      const current = await AsyncStorage.getItem(key);
      const total = (current ? parseInt(current, 10) : 0) + count;
      await AsyncStorage.setItem(key, String(total));
      console.log(`[BG Removal] Monthly usage: ${total}`);
    } catch (err) {
      console.warn('Failed to track bg removal usage:', err);
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
   * Estimated processing time for bg removal
   */
  getEstimatedTime: (itemCount: number): string => {
    const seconds = itemCount * 4; // ~4 seconds per item
    const minutes = Math.ceil(seconds / 60);
    return `~${minutes} minute${minutes !== 1 ? 's' : ''}`;
  },
};
