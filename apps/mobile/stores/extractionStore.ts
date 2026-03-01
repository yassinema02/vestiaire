/**
 * Extraction Store
 * Manages bulk upload, detection, background removal, review, and import
 * Story 10.1: Bulk Photo Upload
 * Story 10.2: Multi-Item Detection
 * Story 10.3: Background Removal for Extracted Items
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
  BgRemovalProgress,
  ReviewableItem,
} from '../types/extraction';
import { supabase } from '../services/supabase';
import { bulkUploadService } from '../services/bulkUploadService';
import { extractionService } from '../services/extractionService';
import { batchBgRemovalService } from '../services/batchBgRemovalService';
import { itemsService, CreateItemInput, WardrobeItem } from '../services/items';
import { extractionCategorizationService } from '../services/extractionCategorizationService';
import { extractionNotificationService } from '../services/extractionNotificationService';

interface ExtractionState {
  selectedPhotos: string[];
  uploadProgress: BulkUploadProgress | null;
  isUploading: boolean;
  isProcessing: boolean;
  processingProgress: { processed: number; total: number } | null;
  isBgRemoving: boolean;
  bgRemovalProgress: BgRemovalProgress | null;
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
}

interface ExtractionActions {
  selectPhotos: () => Promise<void>;
  clearSelection: () => void;
  startUpload: () => Promise<void>;
  startProcessing: (jobId: string) => Promise<void>;
  startBgRemoval: (jobId: string) => Promise<void>;
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
  reset: () => void;
}

type ExtractionStore = ExtractionState & ExtractionActions;

let pollInterval: ReturnType<typeof setInterval> | null = null;

export const useExtractionStore = create<ExtractionStore>((set, get) => ({
  // State
  selectedPhotos: [],
  uploadProgress: null,
  isUploading: false,
  isProcessing: false,
  processingProgress: null,
  isBgRemoving: false,
  bgRemovalProgress: null,
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
      const { urls, error: uploadError } = await bulkUploadService.uploadBatch(
        selectedPhotos,
        (progress) => set({ uploadProgress: progress })
      );

      if (uploadError || urls.length === 0) {
        set({
          isUploading: false,
          error: 'Failed to upload photos. Please try again.',
        });
        return;
      }

      const { job, error: jobError } =
        await bulkUploadService.createExtractionJob(urls);

      if (jobError || !job) {
        set({
          isUploading: false,
          error: 'Photos uploaded but failed to create processing job.',
        });
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

    const { result, error } = await extractionService.processJob(
      jobId,
      (processed, total) => {
        set({ processingProgress: { processed, total } });
      }
    );

    if (error || !result) {
      set({
        isProcessing: false,
        error: error?.message || 'Detection failed. Please try again.',
      });
      const { job } = await bulkUploadService.getJob(jobId);
      if (job) set({ currentJob: job });
      return;
    }

    // Parse results
    const items = extractionService.flattenDetectedItems(result);
    const summary = extractionService.getCategorySummary(result);

    // Refresh job
    const { job: updatedJob } = await bulkUploadService.getJob(jobId);

    // Cleanup uploaded photos (fire and forget)
    if (updatedJob?.photo_urls) {
      bulkUploadService.cleanupPhotos(updatedJob.photo_urls);
    }

    set({
      isProcessing: false,
      currentJob: updatedJob || get().currentJob,
      detectedItems: items,
      categorySummary: summary,
    });

    // Auto-trigger background removal
    if (items.length > 0 && updatedJob) {
      get().startBgRemoval(updatedJob.id);
    }
  },

  startBgRemoval: async (jobId: string) => {
    const { isBgRemoving, currentJob } = get();
    if (isBgRemoving || !currentJob) return;

    set({ isBgRemoving: true, bgRemovalProgress: null });

    const processedItems = await batchBgRemovalService.processExtractedItems(
      currentJob,
      (progress) => set({ bgRemovalProgress: progress })
    );

    set({ processedItems, isBgRemoving: false });

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
              bg_removal_status: processed.bg_removal_status,
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
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }

    pollInterval = setInterval(async () => {
      const { job, error } = await bulkUploadService.getJob(jobId);

      if (error) {
        console.warn('Poll error:', error.message);
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
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }

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
        }
      }
    }, 3000);
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
        bg_removal_status: (item as ProcessedDetectedItem).bg_removal_status || 'skipped',
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

    let added = 0;
    for (const item of items) {
      const normalizedColors = extractionCategorizationService.normalizeColors(
        item.editedColors || item.colors
      );

      const input: CreateItemInput = {
        image_url: item.processed_image_url || item.photo_url,
        original_image_url: item.photo_url,
        name: item.editedName || `${item.editedSubCategory || item.sub_category} - ${(item.editedColors || item.colors)?.[0] || ''}`.trim(),
        category: item.editedCategory || item.category,
        sub_category: item.editedSubCategory || item.sub_category,
        colors: normalizedColors.length > 0 ? normalizedColors : (item.editedColors || item.colors),
        // Extraction metadata (Story 10.5)
        creation_method: 'ai_extraction',
        extraction_source: 'photo_import',
        extraction_job_id: jobId,
        ai_confidence: item.confidence,
      };

      const { error } = await itemsService.createItem(input);
      if (!error) added++;
      set({ importProgress: { done: added, total: items.length } });
    }

    // Update job count
    if (jobId) {
      await supabase
        .from('wardrobe_extraction_jobs')
        .update({ items_added_count: added })
        .eq('id', jobId);
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

    // Auto-trigger bg removal on retry results
    if (items.length > 0 && updatedJob) {
      get().startBgRemoval(updatedJob.id);
    }
  },

  skipFailedPhotos: () => {
    // Clear error and proceed — successful items are already in processedItems
    set({ error: null, failedPhotoUrls: [] });
  },

  reset: () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    set({
      selectedPhotos: [],
      uploadProgress: null,
      isUploading: false,
      isProcessing: false,
      processingProgress: null,
      isBgRemoving: false,
      bgRemovalProgress: null,
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
