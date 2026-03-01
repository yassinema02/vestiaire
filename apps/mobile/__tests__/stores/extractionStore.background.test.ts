/**
 * Extraction Store Background & Retry Tests
 * Story 10.6: Extraction Progress & Feedback
 */

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { geminiApiKey: 'test-key' } } },
}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: jest.fn() },
  })),
}));

const mockGetItems = jest.fn().mockResolvedValue({ items: [], error: null });
const mockCreateItem = jest.fn().mockResolvedValue({ item: {}, error: null });
jest.mock('../../services/items', () => ({
  itemsService: { getItems: () => mockGetItems(), createItem: (input: any) => mockCreateItem(input) },
  CreateItemInput: {},
  WardrobeItem: {},
}));

jest.mock('../../services/supabase', () => ({
  supabase: { from: jest.fn().mockReturnValue({ update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({}) }) }) },
}));

jest.mock('../../services/bulkUploadService', () => ({
  bulkUploadService: {
    selectPhotos: jest.fn(),
    uploadBatch: jest.fn(),
    createExtractionJob: jest.fn(),
    getJob: jest.fn().mockResolvedValue({ job: null, error: null }),
    cleanupPhotos: jest.fn(),
    getEstimatedTime: jest.fn().mockReturnValue('~1 minute'),
  },
}));

jest.mock('../../services/extractionService', () => ({
  extractionService: {
    processJob: jest.fn().mockResolvedValue({ result: null, error: { message: 'test error' } }),
    flattenDetectedItems: jest.fn().mockReturnValue([]),
    getCategorySummary: jest.fn().mockReturnValue({}),
  },
}));

jest.mock('../../services/batchBgRemovalService', () => ({
  batchBgRemovalService: {
    processExtractedItems: jest.fn().mockResolvedValue([]),
    getEstimatedTime: jest.fn().mockReturnValue('~30 seconds'),
  },
}));

jest.mock('../../services/extractionCategorizationService', () => ({
  extractionCategorizationService: {
    findDuplicates: jest.fn().mockReturnValue([]),
    normalizeColors: jest.fn().mockImplementation((c: string[]) => c),
  },
}));

jest.mock('../../services/extractionNotificationService', () => ({
  extractionNotificationService: {
    notifyComplete: jest.fn(),
    notifyFailed: jest.fn(),
  },
}));

import { useExtractionStore } from '../../stores/extractionStore';

describe('extractionStore - background & retry (Story 10.6)', () => {
  beforeEach(() => {
    useExtractionStore.getState().reset();
  });

  describe('setBackgrounded', () => {
    it('sets isBackgrounded to true', () => {
      useExtractionStore.getState().setBackgrounded(true);
      expect(useExtractionStore.getState().isBackgrounded).toBe(true);
    });

    it('sets isBackgrounded to false', () => {
      useExtractionStore.getState().setBackgrounded(true);
      useExtractionStore.getState().setBackgrounded(false);
      expect(useExtractionStore.getState().isBackgrounded).toBe(false);
    });
  });

  describe('retryFailedPhotos', () => {
    it('does nothing if no currentJob', async () => {
      await useExtractionStore.getState().retryFailedPhotos();
      expect(useExtractionStore.getState().retryCount).toBe(0);
    });

    it('does nothing if retryCount >= 2', async () => {
      useExtractionStore.setState({
        retryCount: 2,
        currentJob: { id: 'job-1', user_id: 'u1', status: 'completed', total_photos: 5, processed_photos: 3, photo_urls: [], detected_items: null, error_message: null, items_added_count: 0, created_at: '', updated_at: '' },
      });
      await useExtractionStore.getState().retryFailedPhotos();
      expect(useExtractionStore.getState().retryCount).toBe(2); // unchanged
    });

    it('increments retryCount on retry', async () => {
      useExtractionStore.setState({
        retryCount: 0,
        currentJob: {
          id: 'job-1', user_id: 'u1', status: 'completed', total_photos: 5, processed_photos: 3,
          photo_urls: ['a.jpg', 'b.jpg'],
          detected_items: { total_items_detected: 2, failed_photos: 1, photos: [{ photo_url: 'a.jpg', detected_items: [], error: 'failed' }] },
          error_message: null, items_added_count: 0, created_at: '', updated_at: '',
        },
      });
      await useExtractionStore.getState().retryFailedPhotos();
      expect(useExtractionStore.getState().retryCount).toBe(1);
    });

    it('caps retries at 2', async () => {
      useExtractionStore.setState({
        retryCount: 1,
        currentJob: {
          id: 'job-1', user_id: 'u1', status: 'completed', total_photos: 5, processed_photos: 3,
          photo_urls: ['a.jpg'],
          detected_items: { total_items_detected: 2, failed_photos: 1, photos: [{ photo_url: 'a.jpg', detected_items: [], error: 'failed' }] },
          error_message: null, items_added_count: 0, created_at: '', updated_at: '',
        },
      });
      await useExtractionStore.getState().retryFailedPhotos();
      expect(useExtractionStore.getState().retryCount).toBe(2);
      // Another retry should be blocked
      await useExtractionStore.getState().retryFailedPhotos();
      expect(useExtractionStore.getState().retryCount).toBe(2);
    });
  });

  describe('skipFailedPhotos', () => {
    it('clears error and failedPhotoUrls', () => {
      useExtractionStore.setState({
        error: 'Some error',
        failedPhotoUrls: ['a.jpg', 'b.jpg'],
      });
      useExtractionStore.getState().skipFailedPhotos();
      expect(useExtractionStore.getState().error).toBeNull();
      expect(useExtractionStore.getState().failedPhotoUrls).toEqual([]);
    });
  });

  describe('reset', () => {
    it('resets background and retry state', () => {
      useExtractionStore.setState({
        isBackgrounded: true,
        completionPending: true,
        retryCount: 2,
        failedPhotoUrls: ['a.jpg'],
      });
      useExtractionStore.getState().reset();
      const state = useExtractionStore.getState();
      expect(state.isBackgrounded).toBe(false);
      expect(state.completionPending).toBe(false);
      expect(state.retryCount).toBe(0);
      expect(state.failedPhotoUrls).toEqual([]);
    });
  });
});
