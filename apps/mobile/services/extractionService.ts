/**
 * Extraction Service
 * Server-proxied Gemini-powered batch item detection for wardrobe photos
 * Story 10.2: Multi-Item Detection
 */

import { supabase } from './supabase';
import {
  DetectedItem,
  PhotoDetectionResult,
  ExtractionJobResult,
  ExtractionJob,
} from '../types/extraction';
import { ITEM_DETECTION_PROMPT } from '../constants/prompts';
import { trackedGenerateContent, isGeminiConfigured } from './aiUsageLogger';
import { optimizeForAI } from './imageOptimizer';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

const MAX_ITEMS_PER_PHOTO = 5;

// Prompt moved to constants/prompts.ts as ITEM_DETECTION_PROMPT

const VALID_CATEGORIES = ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories', 'Dresses', 'Activewear'];

/**
 * Detect items in a single photo using Gemini Vision
 */
async function detectItemsInPhoto(
  photoUrl: string,
  photoIndex: number,
): Promise<PhotoDetectionResult> {
  try {
    // Optimize image for AI (512px, 85% JPEG)
    const optimizedUri = await optimizeForAI(photoUrl);

    // Fetch image and convert to base64
    const imageResponse = await fetchWithTimeout(optimizedUri, { timeout: 30_000 });
    const imageBlob = await imageResponse.blob();

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });

    const result = await trackedGenerateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { text: ITEM_DETECTION_PROMPT },
          { inlineData: { mimeType: 'image/jpeg', data: base64 } },
        ],
      }],
    }, 'extraction');

    const text = result.text;
    if (!text) {
      return { photo_url: photoUrl, photo_index: photoIndex, detected_items: [], error: 'No response from AI' };
    }

    // Parse JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return { photo_url: photoUrl, photo_index: photoIndex, detected_items: [], error: 'Failed to parse AI response' };
    }

    const rawItems = JSON.parse(jsonMatch[0]) as any[];

    // Validate and cap at MAX_ITEMS_PER_PHOTO
    const validatedItems: DetectedItem[] = rawItems
      .slice(0, MAX_ITEMS_PER_PHOTO)
      .map((item) => ({
        category: VALID_CATEGORIES.includes(item.category) ? item.category : 'Tops',
        sub_category: item.sub_category || 'Unknown',
        colors: Array.isArray(item.colors) ? item.colors : [],
        style: item.style || 'casual',
        material: item.material || 'unknown',
        position_description: item.position_description || '',
        bounding_box: Array.isArray(item.bounding_box) && item.bounding_box.length === 4
          ? item.bounding_box as [number, number, number, number]
          : undefined,
        confidence: typeof item.confidence === 'number' ? Math.min(100, Math.max(0, item.confidence)) : 50,
        photo_index: photoIndex,
        photo_url: photoUrl,
      }));

    return {
      photo_url: photoUrl,
      photo_index: photoIndex,
      detected_items: validatedItems,
      error: null,
    };
  } catch (err: any) {
    console.warn(`Detection failed for photo ${photoIndex}:`, err.message);
    return {
      photo_url: photoUrl,
      photo_index: photoIndex,
      detected_items: [],
      error: err.message || 'Detection failed',
    };
  }
}

export const extractionService = {
  /**
   * Process an extraction job: detect items in all photos, update job row progressively
   */
  processJob: async (
    jobId: string,
    onProgress?: (processed: number, total: number) => void,
    photoUrls?: string[]
  ): Promise<{ result: ExtractionJobResult | null; error: Error | null }> => {
    if (!isGeminiConfigured()) {
      return { result: null, error: new Error('AI proxy not configured') };
    }

    const isLocalJob = jobId.startsWith('local-');

    try {
      let jobPhotoUrls: string[];

      if (photoUrls) {
        // Use provided URLs directly (local-only flow)
        jobPhotoUrls = photoUrls;
      } else if (!isLocalJob) {
        // Fetch job from DB
        const { data: job, error: fetchError } = await supabase
          .from('wardrobe_extraction_jobs')
          .select()
          .eq('id', jobId)
          .single();

        if (fetchError || !job) {
          return { result: null, error: fetchError || new Error('Job not found') };
        }
        jobPhotoUrls = job.photo_urls;

        // Update status → processing
        await supabase
          .from('wardrobe_extraction_jobs')
          .update({ status: 'processing', started_at: new Date().toISOString() })
          .eq('id', jobId);
      } else {
        return { result: null, error: new Error('Local job requires photoUrls parameter') };
      }

      const allResults: PhotoDetectionResult[] = [];
      let totalItems = 0;
      let failedPhotos = 0;

      // Process each photo sequentially
      for (let i = 0; i < jobPhotoUrls.length; i++) {
        const photoResult = await detectItemsInPhoto(jobPhotoUrls[i], i);

        allResults.push(photoResult);
        totalItems += photoResult.detected_items.length;
        if (photoResult.error) failedPhotos++;

        // Update progress on job row (skip for local jobs)
        if (!isLocalJob) {
          await supabase
            .from('wardrobe_extraction_jobs')
            .update({ processed_photos: i + 1 })
            .eq('id', jobId);
        }

        onProgress?.(i + 1, jobPhotoUrls.length);
      }

      const jobResult: ExtractionJobResult = {
        photos: allResults,
        total_items_detected: totalItems,
        failed_photos: failedPhotos,
      };

      // Update job with results (skip for local jobs)
      if (!isLocalJob) {
        await supabase
          .from('wardrobe_extraction_jobs')
          .update({
            status: 'completed',
            detected_items: jobResult,
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);
      }

      return { result: jobResult, error: null };
    } catch (error: any) {
      console.error('Extraction job failed:', error);

      // Mark job as failed (skip for local jobs)
      if (!isLocalJob) {
        await supabase
          .from('wardrobe_extraction_jobs')
          .update({
            status: 'failed',
            error_message: error.message || 'Processing failed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);
      }

      return { result: null, error: error as Error };
    }
  },

  /**
   * Get a flat list of all detected items from a job result
   */
  flattenDetectedItems: (result: ExtractionJobResult): DetectedItem[] => {
    return result.photos.flatMap((photo) => photo.detected_items);
  },

  /**
   * Get category summary from job result (e.g., { Tops: 8, Bottoms: 5 })
   */
  getCategorySummary: (result: ExtractionJobResult): Record<string, number> => {
    const summary: Record<string, number> = {};
    for (const photo of result.photos) {
      for (const item of photo.detected_items) {
        summary[item.category] = (summary[item.category] || 0) + 1;
      }
    }
    return summary;
  },
};
