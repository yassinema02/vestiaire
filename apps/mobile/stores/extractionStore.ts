/**
 * Extraction Store
 * Manages bulk upload, detection, product photo generation, review, and import
 * Story 10.1: Bulk Photo Upload
 * Story 10.2: Multi-Item Detection
 * Story 10.3: Product Photo Generation for Extracted Items
 * Story 10.4: Review & Confirm Interface
 * Story 10.6: Extraction Progress & Feedback
 */

import { create } from 'zustand';
import {
  ExtractionJob,
  BulkUploadProgress,
  DetectedItem,
  ExtractionJobResult,
  ProcessedDetectedItem,
  PhotoGenProgress,
  ReviewableItem,
  FailedExtractionItem,
} from '../types/extraction';
import { supabase } from '../services/supabase';
import { bulkUploadService } from '../services/bulkUploadService';
import { extractionService } from '../services/extractionService';
import { batchProductPhotoService } from '../services/batchProductPhotoService';
import { itemsService, CreateItemInput, WardrobeItem } from '../services/items';
import { extractionCategorizationService } from '../services/extractionCategorizationService';
import { extractionNotificationService } from '../services/extractionNotificationService';

interface ExtractionState {
  selectedPhotos: string[];
  uploadProgress: BulkUploadProgress | null;
  isUploading: boolean;
  isProcessing: boolean;
  processingProgress: { processed: number; total: number } | null;
  isGeneratingPhotos: boolean;
  photoGenProgress: PhotoGenProgress | null;
  currentJob: ExtractionJob | null;
  detectedItems: DetectedItem[] | null;
  processedItems: ProcessedDetectedItem[] | null;
  categorySummary: Record<string, number> | null;
  error: string | null;
  // Review state (Story 10.4)
  reviewableItems: ReviewableItem[];
  isImporting: boolean;
  importProgress: { done: number; total: number } | null;
  // Background & retry state (Story 10.6)
  isBackgrounded: boolean;
  completionPending: boolean;
  retryCount: number;
  failedPhotoUrls: string[];
  // Failed extraction items (shown on home screen)
  failedExtractionItems: FailedExtractionItem[];
}

interface ExtractionActions {
  selectPhotos: () => Promise<void>;
  clearSelection: () => void;
  startUpload: () => Promise<void>;
  startProcessing: (jobId: string) => Promise<void>;
  startPhotoGeneration: (jobId: string) => Promise<void>;
  pollJobStatus: (jobId: string) => Promise<void>;
  // Review actions (Story 10.4, 10.5)
  initReview: () => Promise<void>;
  toggleItem: (index: number) => void;
  editItem: (index: number, edits: Partial<Pick<ReviewableItem, 'editedName' | 'editedCategory' | 'editedSubCategory' | 'editedColors'>>) => void;
  selectAll: () => void;
  deselectAll: () => void;
  deselectByCategory: (category: string) => void;
  getSelectedCount: () => number;
  getSelectedItems: () => ReviewableItem[];
  importToWardrobe: () => Promise<number>;
  // Background & retry actions (Story 10.6)
  setBackgrounded: (value: boolean) => void;
  retryFailedPhotos: () => Promise<void>;
  skipFailedPhotos: () => void;
  dismissFailedItems: () => void;
  reset: () => void;
}

type ExtractionStore = ExtractionState & ExtractionActions;

let pollTimer: ReturnType<typeof setTimeout> | null = null;
let pollCancelled = false;

export const useExtractionStore = create<ExtractionStore>((set, get) => ({
  // State
  selectedPhotos: [],
  uploadProgress: null,
  isUploading: false,
  isProcessing: false,
  processingProgress: null,
  isGeneratingPhotos: false,
  photoGenProgress: null,
  currentJob: null,
  detectedItems: null,
  processedItems: null,
  categorySummary: null,
  error: null,
  reviewableItems: [],
  isImporting: false,
  importProgress: null,
  isBackgrounded: false,
  completionPending: false,
  retryCount: 0,
  failedPhotoUrls: [],
  failedExtractionItems: [],

  // Actions

  selectPhotos: async () => {
    try {
      set({ error: null });
      const uris = await bulkUploadService.selectPhotos();
      if (uris.length > 0) {
        set({ selectedPhotos: uris });
      }
    } catch (error) {
      console.error('Photo selection error:', error);
      set({ error: 'Failed to open photo picker' });
    }
  },

  clearSelection: () => {
    set({ selectedPhotos: [], error: null });
  },

  startUpload: async () => {
    const { selectedPhotos, isUploading } = get();
    if (isUploading || selectedPhotos.length === 0) return;

    set({ isUploading: true, error: null, uploadProgress: null });

    try {
      // Try uploading to Supabase first
      const { urls, error: uploadError } = await bulkUploadService.uploadBatch(
        selectedPhotos,
        (progress) => set({ uploadProgress: progress })
      );

      // Use uploaded URLs if available, otherwise fall back to local URIs
      // Local URIs work fine for detection (converted to base64 anyway)
      const photoUrls = urls.length > 0 ? urls : selectedPhotos;

      if (uploadError && urls.length === 0) {
        console.warn('Supabase upload failed, using local URIs for detection:', uploadError.message);
      }

      const { job, error: jobError } =
        await bulkUploadService.createExtractionJob(photoUrls);

      if (jobError || !job) {
        // If job creation also fails (e.g., no DB table), create a synthetic job
        console.warn('Job creation failed, using local-only flow:', jobError?.message);
        const syntheticJob: ExtractionJob = {
          id: `local-${Date.now()}`,
          user_id: 'local',
          photo_urls: photoUrls,
          total_photos: photoUrls.length,
          processed_photos: 0,
          status: 'pending',
          detected_items: null,
          items_added_count: 0,
          error_message: null,
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
        };
        set({ isUploading: false, currentJob: syntheticJob });
        get().startProcessing(syntheticJob.id);
        return;
      }

      set({ isUploading: false, currentJob: job });

      // Auto-trigger detection → bg removal pipeline
      get().startProcessing(job.id);
    } catch (error) {
      console.error('Upload flow error:', error);
      set({
        isUploading: false,
        error: 'Something went wrong. Please try again.',
      });
    }
  },

  startProcessing: async (jobId: string) => {
    const { isProcessing } = get();
    if (isProcessing) return;

    set({ isProcessing: true, processingProgress: null, error: null });

    const { currentJob } = get();
    const isLocalJob = jobId.startsWith('local-');
    const { result, error } = await extractionService.processJob(
      jobId,
      (processed, total) => {
        set({ processingProgress: { processed, total } });
      },
      isLocalJob ? currentJob?.photo_urls : undefined
    );

    if (error || !result) {
      set({
        isProcessing: false,
        error: error?.message || 'Detection failed. Please try again.',
      });
      if (!isLocalJob) {
        const { job } = await bulkUploadService.getJob(jobId);
        if (job) set({ currentJob: job });
      }
      return;
    }

    // Parse results
    const items = extractionService.flattenDetectedItems(result);
    const summary = extractionService.getCategorySummary(result);

    // Refresh job from DB (skip for local jobs)
    let updatedJob = get().currentJob;
    if (!isLocalJob) {
      const { job: refreshed } = await bulkUploadService.getJob(jobId);
      if (refreshed) updatedJob = refreshed;

      // Cleanup uploaded photos (fire and forget)
      if (updatedJob?.photo_urls) {
        bulkUploadService.cleanupPhotos(updatedJob.photo_urls);
      }
    }

    // For local jobs, attach detected_items to the job object so photo gen can find them
    if (isLocalJob && updatedJob) {
      updatedJob = { ...updatedJob, detected_items: result, status: 'completed' };
    }

    set({
      isProcessing: false,
      currentJob: updatedJob || get().currentJob,
      detectedItems: items,
      categorySummary: summary,
    });

    // Start photo generation in background — don't block the review flow
    if (items.length > 0 && updatedJob) {
      // Fire and forget — user can review/save while this runs
      get().startPhotoGeneration(updatedJob.id);
    }
  },

  startPhotoGeneration: async (jobId: string) => {
    const { isGeneratingPhotos, currentJob } = get();
    if (isGeneratingPhotos || !currentJob) return;

    set({ isGeneratingPhotos: true, photoGenProgress: null });

    const processedItems = await batchProductPhotoService.processExtractedItems(
      currentJob,
      (progress) => set({ photoGenProgress: progress })
    );

    set({ processedItems, isGeneratingPhotos: false });

    // Update reviewable items with enhanced images if review is already open
    const { reviewableItems } = get();
    if (reviewableItems.length > 0 && processedItems.length > 0) {
      const updated = reviewableItems.map(item => {
        const processed = processedItems.find(
          p => p.photo_index === item.photo_index &&
               p.sub_category === item.sub_category &&
               p.category === item.category
        );
        if (processed?.processed_image_url || processed?.cropped_image_url) {
          return {
            ...item,
            processed_image_url: processed.processed_image_url,
            cropped_image_url: processed.cropped_image_url,
            photo_gen_status: processed.photo_gen_status,
          };
        }
        return item;
      });
      set({ reviewableItems: updated });
    }

    // Notify if backgrounded (Story 10.6)
    const { isBackgrounded } = get();
    if (isBackgrounded) {
      const itemCount = processedItems.length;
      const photoCount = get().currentJob?.total_photos ?? 0;
      extractionNotificationService.notifyComplete(itemCount, photoCount);
      set({ completionPending: true });
    }

    // Update job JSONB with processed image URLs
    if (currentJob.detected_items && processedItems.length > 0) {
      const jobResult = currentJob.detected_items as ExtractionJobResult;

      // Merge processed URLs back into the job result
      const updatedPhotos = jobResult.photos.map((photo) => ({
        ...photo,
        detected_items: photo.detected_items.map((item) => {
          const processed = processedItems.find(
            (p) =>
              p.photo_index === item.photo_index &&
              p.sub_category === item.sub_category &&
              p.category === item.category
          );
          if (processed) {
            return {
              ...item,
              processed_image_url: processed.processed_image_url,
              cropped_image_url: processed.cropped_image_url,
              photo_gen_status: processed.photo_gen_status,
            };
          }
          return item;
        }),
      }));

      const updatedResult: ExtractionJobResult = {
        ...jobResult,
        photos: updatedPhotos,
      };

      await supabase
        .from('wardrobe_extraction_jobs')
        .update({ detected_items: updatedResult })
        .eq('id', jobId);

      // Refresh job
      const { job: refreshed } = await bulkUploadService.getJob(jobId);
      if (refreshed) set({ currentJob: refreshed });
    }
  },

  pollJobStatus: async (jobId: string) => {
    // Cancel any existing poll loop
    pollCancelled = true;
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    pollCancelled = false;

    const poll = async () => {
      if (pollCancelled) return;

      let job: ExtractionJob | null = null;
      let error: Error | null = null;

      try {
        const result = await bulkUploadService.getJob(jobId);
        job = result.job;
        error = result.error;
      } catch (err) {
        error = err as Error;
      }

      // Re-check cancellation after async gap to prevent scheduling
      // new timers on a cancelled poll loop
      if (pollCancelled) {
        pollTimer = null;
        return;
      }

      if (error) {
        console.warn('Poll error:', error.message);
        // Schedule next poll even on error
        pollTimer = setTimeout(poll, 3000);
        return;
      }

      if (job) {
        set({ currentJob: job });

        if (job.status === 'processing') {
          set({
            processingProgress: {
              processed: job.processed_photos,
              total: job.total_photos,
            },
          });
        }

        if (job.status === 'completed' || job.status === 'failed') {
          // Terminal state — stop polling
          pollTimer = null;

          if (job.status === 'completed' && job.detected_items) {
            const result = job.detected_items as ExtractionJobResult;
            set({
              detectedItems: extractionService.flattenDetectedItems(result),
              categorySummary: extractionService.getCategorySummary(result),
              isProcessing: false,
            });
          }

          if (job.status === 'failed') {
            set({
              isProcessing: false,
              error: job.error_message || 'Processing failed',
            });
          }
          return; // Don't schedule another poll
        }
      }

      // Schedule next poll only after current one completes (sequential)
      pollTimer = setTimeout(poll, 3000);
    };

    // Start first poll
    poll();
  },

  // Review & Import Actions (Story 10.4, 10.5)

  initReview: async () => {
    const { processedItems, detectedItems } = get();
    const items = processedItems || (detectedItems as ProcessedDetectedItem[] | null) || [];

    // Fetch existing wardrobe items for duplicate detection
    let existingItems: WardrobeItem[] = [];
    try {
      const { items: fetched } = await itemsService.getItems();
      existingItems = fetched;
    } catch {
      // Non-critical — skip duplicate detection if fetch fails
    }

    const reviewable: ReviewableItem[] = items.map((item) => {
      const needsReview = item.confidence < 70;
      const isSelected = item.confidence >= 50; // Auto-deselect < 50

      // Duplicate detection
      const duplicates = extractionCategorizationService.findDuplicates(item, existingItems);
      const duplicateOf = duplicates.length > 0
        ? duplicates.reduce((best, d) => d.similarity > best.similarity ? d : best)
        : undefined;

      return {
        ...item,
        photo_gen_status: (item as ProcessedDetectedItem).photo_gen_status || 'skipped',
        isSelected,
        needsReview,
        duplicateOf,
      };
    });

    // Sort: low-confidence items first for user review
    reviewable.sort((a, b) => a.confidence - b.confidence);

    set({ reviewableItems: reviewable });
  },

  toggleItem: (index: number) => {
    const { reviewableItems } = get();
    if (index < 0 || index >= reviewableItems.length) return;
    const updated = [...reviewableItems];
    updated[index] = { ...updated[index], isSelected: !updated[index].isSelected };
    set({ reviewableItems: updated });
  },

  editItem: (index, edits) => {
    const { reviewableItems } = get();
    if (index < 0 || index >= reviewableItems.length) return;
    const updated = [...reviewableItems];
    updated[index] = { ...updated[index], ...edits };
    set({ reviewableItems: updated });
  },

  selectAll: () => {
    set({ reviewableItems: get().reviewableItems.map((item) => ({ ...item, isSelected: true })) });
  },

  deselectAll: () => {
    set({ reviewableItems: get().reviewableItems.map((item) => ({ ...item, isSelected: false })) });
  },

  deselectByCategory: (category: string) => {
    set({
      reviewableItems: get().reviewableItems.map((item) => {
        const effectiveCategory = item.editedCategory || item.category;
        return effectiveCategory === category ? { ...item, isSelected: false } : item;
      }),
    });
  },

  getSelectedCount: () => {
    return get().reviewableItems.filter((item) => item.isSelected).length;
  },

  getSelectedItems: () => {
    return get().reviewableItems.filter((item) => item.isSelected);
  },

  importToWardrobe: async () => {
    const items = get().getSelectedItems();
    if (items.length === 0) return 0;

    const jobId = get().currentJob?.id;
    set({ isImporting: true, importProgress: { done: 0, total: items.length }, error: null });

    // Wait for photo generation to finish before importing
    if (get().isGeneratingPhotos) {
      console.log('[Import] Waiting for photo generation to complete...');
      for (let i = 0; i < 150; i++) {
        await new Promise(r => setTimeout(r, 2000));
        if (!get().isGeneratingPhotos) break;
      }
    }

    // Get the final processed items with generated/cropped photos
    const { processedItems: finalProcessed } = get();

    let added = 0;
    const failed: FailedExtractionItem[] = [];

    for (const item of items) {
      // Match this item to its processed version
      const processed = finalProcessed?.find(
        p => p.photo_index === item.photo_index &&
             p.sub_category === item.sub_category &&
             p.category === item.category
      );

      // Only import if we have an isolated product photo
      const productImageUrl = processed?.processed_image_url || processed?.cropped_image_url;
      if (!productImageUrl) {
        // Photo gen failed — don't add to wardrobe
        const itemName = item.editedName || `${item.editedSubCategory || item.sub_category} - ${(item.editedColors || item.colors)?.[0] || ''}`.trim();
        console.warn(`[Import] Skipping "${itemName}" — no isolated photo available`);
        failed.push({
          name: itemName,
          category: item.editedCategory || item.category,
          sub_category: item.editedSubCategory || item.sub_category,
          colors: item.editedColors || item.colors,
          reason: 'photo_gen_failed',
          timestamp: Date.now(),
        });
        set({ importProgress: { done: added + failed.length, total: items.length } });
        continue;
      }

      const normalizedColors = extractionCategorizationService.normalizeColors(
        item.editedColors || item.colors
      );

      const input: CreateItemInput = {
        image_url: productImageUrl,
        original_image_url: item.photo_url,
        name: item.editedName || `${item.editedSubCategory || item.sub_category} - ${(item.editedColors || item.colors)?.[0] || ''}`.trim(),
        category: item.editedCategory || item.category,
        sub_category: item.editedSubCategory || item.sub_category,
        colors: normalizedColors.length > 0 ? normalizedColors : (item.editedColors || item.colors),
        creation_method: 'ai_extraction',
        extraction_source: 'photo_import',
        extraction_job_id: jobId,
        ai_confidence: item.confidence,
      };

      const { error } = await itemsService.createItem(input);
      if (!error) added++;
      set({ importProgress: { done: added + failed.length, total: items.length } });
    }

    // Update job count
    if (jobId) {
      await supabase
        .from('wardrobe_extraction_jobs')
        .update({ items_added_count: added })
        .eq('id', jobId);
    }

    // Store failed items for home screen banner
    if (failed.length > 0) {
      set({ failedExtractionItems: [...get().failedExtractionItems, ...failed] });
    }

    set({ isImporting: false });
    return added;
  },

  // Background & retry actions (Story 10.6)

  setBackgrounded: (value: boolean) => {
    set({ isBackgrounded: value });
  },

  retryFailedPhotos: async () => {
    const { currentJob, retryCount } = get();
    if (!currentJob || retryCount >= 2) return;

    // Find failed photos from job result
    const jobResult = currentJob.detected_items as ExtractionJobResult | null;
    const failedPhotos = jobResult?.photos
      ?.filter((p: any) => p.error)
      ?.map((p: any) => p.photo_url) || [];

    if (failedPhotos.length === 0) return;

    set({ retryCount: retryCount + 1, error: null, failedPhotoUrls: failedPhotos });

    // Re-run processing on failed photos
    set({ isProcessing: true, processingProgress: null });

    const { result, error } = await extractionService.processJob(
      currentJob.id,
      (processed, total) => {
        set({ processingProgress: { processed, total } });
      }
    );

    if (error || !result) {
      set({
        isProcessing: false,
        error: error?.message || 'Retry failed. Please try again.',
      });
      return;
    }

    const items = extractionService.flattenDetectedItems(result);
    const summary = extractionService.getCategorySummary(result);
    const { job: updatedJob } = await bulkUploadService.getJob(currentJob.id);

    set({
      isProcessing: false,
      currentJob: updatedJob || currentJob,
      detectedItems: items,
      categorySummary: summary,
    });

    // Auto-trigger photo generation on retry results
    if (items.length > 0 && updatedJob) {
      get().startPhotoGeneration(updatedJob.id);
    }
  },

  skipFailedPhotos: () => {
    // Clear error and proceed — successful items are already in processedItems
    set({ error: null, failedPhotoUrls: [] });
  },

  dismissFailedItems: () => {
    set({ failedExtractionItems: [] });
  },

  reset: () => {
    pollCancelled = true;
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    set({
      selectedPhotos: [],
      uploadProgress: null,
      isUploading: false,
      isProcessing: false,
      processingProgress: null,
      isGeneratingPhotos: false,
      photoGenProgress: null,
      currentJob: null,
      detectedItems: null,
      processedItems: null,
      categorySummary: null,
      error: null,
      reviewableItems: [],
      isImporting: false,
      importProgress: null,
      isBackgrounded: false,
      completionPending: false,
      retryCount: 0,
      failedPhotoUrls: [],
    });
  },
}));
