/**
 * Batch Background Removal Service Tests
 * Story 10.3: Background Removal for Extracted Items
 */

const mockRemoveBackground = jest.fn();
const mockIsConfigured = jest.fn();

jest.mock('../../services/backgroundRemoval', () => ({
    removeBackground: mockRemoveBackground,
    isBackgroundRemovalConfigured: mockIsConfigured,
}));

const mockUploadProcessedImage = jest.fn();

jest.mock('../../services/storage', () => ({
    storageService: {
        uploadProcessedImage: mockUploadProcessedImage,
    },
}));

jest.mock('../../services/auth-helpers', () => ({
    requireUserId: jest.fn().mockResolvedValue('test-user-id'),
}));

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: {
        getItem: mockGetItem,
        setItem: mockSetItem,
    },
}));

jest.mock('../../services/extractionService', () => ({
    extractionService: {
        flattenDetectedItems: jest.fn((result) => {
            const items: any[] = [];
            for (const photo of result.photos) {
                for (const item of photo.detected_items) {
                    items.push(item);
                }
            }
            return items;
        }),
    },
}));

import { batchBgRemovalService } from '../../services/batchBgRemovalService';
import { ExtractionJob, ExtractionJobResult, BgRemovalProgress } from '../../types/extraction';

function makeJob(items: any[]): ExtractionJob {
    const result: ExtractionJobResult = {
        photos: [
            {
                photo_url: 'https://storage.test/photo1.jpg',
                photo_index: 0,
                detected_items: items,
                error: null,
            },
        ],
        total_items_detected: items.length,
        failed_photos: 0,
    };

    return {
        id: 'job-123',
        user_id: 'test-user-id',
        photo_urls: ['https://storage.test/photo1.jpg'],
        total_photos: 1,
        processed_photos: 1,
        detected_items: result,
        items_added_count: 0,
        status: 'completed',
        error_message: null,
        created_at: '2026-02-23T00:00:00Z',
        started_at: '2026-02-23T00:00:01Z',
        completed_at: '2026-02-23T00:00:10Z',
    };
}

function makeItem(overrides: Partial<any> = {}) {
    return {
        category: 'Tops',
        sub_category: 'T-Shirt',
        colors: ['navy'],
        style: 'casual',
        material: 'cotton',
        position_description: 'upper body',
        confidence: 90,
        photo_index: 0,
        photo_url: 'https://storage.test/photo1.jpg',
        ...overrides,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
    mockRemoveBackground.mockResolvedValue({
        processedImageBase64: 'base64-processed-image-data',
        error: null,
    });
    mockUploadProcessedImage.mockResolvedValue({
        url: 'https://storage.test/wardrobe-images/processed_123.png',
        path: 'test-user-id/processed_123.png',
        error: null,
    });
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
});

describe('processExtractedItems', () => {
    it('processes all items through bg removal pipeline', async () => {
        const items = [makeItem(), makeItem({ sub_category: 'Sweater', confidence: 85 })];
        const job = makeJob(items);

        const progressUpdates: BgRemovalProgress[] = [];
        const result = await batchBgRemovalService.processExtractedItems(
            job,
            (p) => progressUpdates.push({ ...p })
        );

        expect(result).toHaveLength(2);
        expect(result[0].bg_removal_status).toBe('success');
        expect(result[0].processed_image_url).toBe('https://storage.test/wardrobe-images/processed_123.png');
        expect(result[1].bg_removal_status).toBe('success');
        expect(mockRemoveBackground).toHaveBeenCalledTimes(2);
        expect(mockUploadProcessedImage).toHaveBeenCalledTimes(2);
    });

    it('skips low-confidence items (confidence < 50)', async () => {
        const items = [
            makeItem({ confidence: 90 }),
            makeItem({ confidence: 30, sub_category: 'Unknown' }),
        ];
        const job = makeJob(items);

        const result = await batchBgRemovalService.processExtractedItems(job, () => {});

        expect(result).toHaveLength(2);
        expect(result[0].bg_removal_status).toBe('success');
        expect(result[1].bg_removal_status).toBe('skipped');
        expect(mockRemoveBackground).toHaveBeenCalledTimes(1);
    });

    it('marks items as failed when bg removal errors', async () => {
        mockRemoveBackground
            .mockResolvedValueOnce({ processedImageBase64: 'data', error: null })
            .mockResolvedValueOnce({ processedImageBase64: null, error: new Error('Gemini timeout') });

        const items = [makeItem(), makeItem({ sub_category: 'Jacket' })];
        const job = makeJob(items);

        const result = await batchBgRemovalService.processExtractedItems(job, () => {});

        expect(result[0].bg_removal_status).toBe('success');
        expect(result[1].bg_removal_status).toBe('failed');
        expect(result[1].processed_image_url).toBeUndefined();
    });

    it('marks items as failed when upload errors', async () => {
        mockUploadProcessedImage.mockResolvedValueOnce({
            url: null,
            error: new Error('Storage quota exceeded'),
        });

        const items = [makeItem()];
        const job = makeJob(items);

        const result = await batchBgRemovalService.processExtractedItems(job, () => {});

        expect(result[0].bg_removal_status).toBe('failed');
    });

    it('skips all items when bg removal is not configured', async () => {
        mockIsConfigured.mockReturnValue(false);

        const items = [makeItem(), makeItem({ sub_category: 'Pants' })];
        const job = makeJob(items);

        const result = await batchBgRemovalService.processExtractedItems(job, () => {});

        expect(result).toHaveLength(2);
        expect(result[0].bg_removal_status).toBe('skipped');
        expect(result[1].bg_removal_status).toBe('skipped');
        expect(mockRemoveBackground).not.toHaveBeenCalled();
    });

    it('reports progress correctly throughout batch', async () => {
        const items = [makeItem(), makeItem({ sub_category: 'Jacket' }), makeItem({ sub_category: 'Coat' })];
        const job = makeJob(items);

        const progressUpdates: BgRemovalProgress[] = [];
        await batchBgRemovalService.processExtractedItems(
            job,
            (p) => progressUpdates.push({ ...p })
        );

        // One progress update per item + final
        expect(progressUpdates).toHaveLength(4);
        expect(progressUpdates[0]).toEqual({ processed: 0, total: 3, succeeded: 0, failed: 0 });
        expect(progressUpdates[1]).toEqual({ processed: 1, total: 3, succeeded: 1, failed: 0 });
        expect(progressUpdates[2]).toEqual({ processed: 2, total: 3, succeeded: 2, failed: 0 });
        expect(progressUpdates[3]).toEqual({ processed: 3, total: 3, succeeded: 3, failed: 0 });
    });

    it('returns empty array when job has no detected items', async () => {
        const job: ExtractionJob = {
            id: 'job-empty',
            user_id: 'test-user-id',
            photo_urls: [],
            total_photos: 0,
            processed_photos: 0,
            detected_items: null,
            items_added_count: 0,
            status: 'completed',
            error_message: null,
            created_at: '2026-02-23T00:00:00Z',
            started_at: null,
            completed_at: null,
        };

        const result = await batchBgRemovalService.processExtractedItems(job, () => {});

        expect(result).toEqual([]);
        expect(mockRemoveBackground).not.toHaveBeenCalled();
    });

    it('tracks succeeded and failed counts accurately', async () => {
        mockRemoveBackground
            .mockResolvedValueOnce({ processedImageBase64: 'data', error: null })
            .mockResolvedValueOnce({ processedImageBase64: null, error: new Error('fail') })
            .mockResolvedValueOnce({ processedImageBase64: 'data', error: null });

        const items = [
            makeItem({ confidence: 90 }),
            makeItem({ confidence: 80, sub_category: 'Jacket' }),
            makeItem({ confidence: 85, sub_category: 'Sweater' }),
        ];
        const job = makeJob(items);

        const progressUpdates: BgRemovalProgress[] = [];
        const result = await batchBgRemovalService.processExtractedItems(
            job,
            (p) => progressUpdates.push({ ...p })
        );

        const final = progressUpdates[progressUpdates.length - 1];
        expect(final.succeeded).toBe(2);
        expect(final.failed).toBe(1);
        expect(final.processed).toBe(3);

        expect(result.filter((r) => r.bg_removal_status === 'success')).toHaveLength(2);
        expect(result.filter((r) => r.bg_removal_status === 'failed')).toHaveLength(1);
    });
});

describe('trackUsage', () => {
    it('increments monthly usage counter', async () => {
        mockGetItem.mockResolvedValue('10');

        await batchBgRemovalService.trackUsage(5);

        expect(mockSetItem).toHaveBeenCalledWith(
            expect.stringMatching(/^bg_removal_usage_\d{4}-\d{2}$/),
            '15'
        );
    });

    it('starts from zero when no existing usage', async () => {
        mockGetItem.mockResolvedValue(null);

        await batchBgRemovalService.trackUsage(3);

        expect(mockSetItem).toHaveBeenCalledWith(
            expect.stringMatching(/^bg_removal_usage_/),
            '3'
        );
    });

    it('does nothing when count is zero', async () => {
        await batchBgRemovalService.trackUsage(0);

        expect(mockGetItem).not.toHaveBeenCalled();
        expect(mockSetItem).not.toHaveBeenCalled();
    });
});

describe('getMonthlyUsage', () => {
    it('returns current monthly count', async () => {
        mockGetItem.mockResolvedValue('47');

        const usage = await batchBgRemovalService.getMonthlyUsage();

        expect(usage).toBe(47);
    });

    it('returns 0 when no usage recorded', async () => {
        mockGetItem.mockResolvedValue(null);

        const usage = await batchBgRemovalService.getMonthlyUsage();

        expect(usage).toBe(0);
    });
});

describe('getEstimatedTime', () => {
    it('returns time estimate based on item count', () => {
        expect(batchBgRemovalService.getEstimatedTime(1)).toBe('~1 minute');
        expect(batchBgRemovalService.getEstimatedTime(15)).toBe('~1 minute');
        expect(batchBgRemovalService.getEstimatedTime(16)).toBe('~2 minutes');
        expect(batchBgRemovalService.getEstimatedTime(30)).toBe('~2 minutes');
    });
});
