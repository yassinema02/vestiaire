/**
 * Extraction Service Tests
 * Story 10.2: Multi-Item Detection
 */

const mockFrom = jest.fn();
const mockStorageFrom = jest.fn();

jest.mock('../../services/supabase', () => ({
    supabase: {
        from: mockFrom,
        auth: {
            getUser: jest.fn().mockResolvedValue({
                data: { user: { id: 'test-user-id' } },
            }),
        },
        storage: {
            from: mockStorageFrom,
        },
    },
}));

jest.mock('../../services/auth-helpers', () => ({
    requireUserId: jest.fn().mockResolvedValue('test-user-id'),
}));

const mockGenerateContent = jest.fn();

jest.mock('expo-constants', () => ({
    __esModule: true,
    default: {
        expoConfig: {
            extra: {
                geminiApiKey: 'test-gemini-key',
            },
        },
    },
}));

jest.mock('@google/genai', () => ({
    GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: {
            generateContent: mockGenerateContent,
        },
    })),
}));

// Mock FileReader for base64 conversion
class MockFileReader {
    result: string = '';
    onloadend: (() => void) | null = null;
    onerror: ((err: any) => void) | null = null;
    readAsDataURL() {
        this.result = 'data:image/jpeg;base64,dGVzdA==';
        setTimeout(() => this.onloadend?.(), 0);
    }
}
(global as any).FileReader = MockFileReader;

// Mock fetch for image download
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { extractionService } from '../../services/extractionService';
import { ExtractionJobResult } from '../../types/extraction';

function buildChain(overrides = {}) {
    const chain = {
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        ...overrides,
    };
    return chain;
}

beforeEach(() => {
    jest.clearAllMocks();

    // Default: fetch returns a blob
    mockFetch.mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['test'])),
    });
});

describe('processJob', () => {
    const mockJob = {
        id: 'job-123',
        user_id: 'test-user-id',
        photo_urls: ['https://storage.test/photo1.jpg', 'https://storage.test/photo2.jpg'],
        total_photos: 2,
        status: 'pending',
    };

    function setupJobMock() {
        // First call: select job, subsequent calls: update
        let callCount = 0;
        mockFrom.mockImplementation((table: string) => {
            callCount++;
            if (callCount === 1) {
                // Fetch job
                return buildChain({
                    single: jest.fn().mockResolvedValue({ data: mockJob, error: null }),
                });
            }
            // Updates
            return buildChain({
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            });
        });
    }

    it('processes photos and returns detection results', async () => {
        setupJobMock();

        const geminiItems = [
            {
                category: 'Tops',
                sub_category: 'T-Shirt',
                colors: ['navy'],
                style: 'casual',
                material: 'cotton',
                position_description: 'worn by person',
                confidence: 90,
            },
        ];

        mockGenerateContent.mockResolvedValue({
            text: JSON.stringify(geminiItems),
        });

        const progressUpdates: any[] = [];
        const { result, error } = await extractionService.processJob(
            'job-123',
            (processed, total) => progressUpdates.push({ processed, total })
        );

        expect(error).toBeNull();
        expect(result).not.toBeNull();
        expect(result!.total_items_detected).toBe(2); // 1 item per photo × 2 photos
        expect(result!.photos).toHaveLength(2);
        expect(result!.failed_photos).toBe(0);
        expect(progressUpdates).toHaveLength(2);
    });

    it('enforces max 5 items per photo', async () => {
        setupJobMock();

        // Return 7 items — should be capped to 5
        const sevenItems = Array.from({ length: 7 }, (_, i) => ({
            category: 'Tops',
            sub_category: `Item ${i}`,
            colors: ['black'],
            style: 'casual',
            material: 'cotton',
            position_description: 'test',
            confidence: 80,
        }));

        mockGenerateContent.mockResolvedValue({
            text: JSON.stringify(sevenItems),
        });

        const { result } = await extractionService.processJob('job-123');

        expect(result).not.toBeNull();
        // Each photo capped to 5 items, 2 photos = max 10
        expect(result!.photos[0].detected_items.length).toBeLessThanOrEqual(5);
    });

    it('handles per-photo failure gracefully', async () => {
        setupJobMock();

        let geminiCallCount = 0;
        mockGenerateContent.mockImplementation(() => {
            geminiCallCount++;
            if (geminiCallCount === 1) {
                throw new Error('Gemini timeout');
            }
            return {
                text: JSON.stringify([{
                    category: 'Shoes',
                    sub_category: 'Sneakers',
                    colors: ['white'],
                    style: 'sporty',
                    material: 'synthetic',
                    position_description: 'on floor',
                    confidence: 85,
                }]),
            };
        });

        const { result, error } = await extractionService.processJob('job-123');

        expect(error).toBeNull();
        expect(result).not.toBeNull();
        expect(result!.failed_photos).toBe(1);
        expect(result!.photos[0].error).toBeTruthy();
        expect(result!.photos[1].detected_items).toHaveLength(1);
    });

    it('validates category values', async () => {
        setupJobMock();

        mockGenerateContent.mockResolvedValue({
            text: JSON.stringify([{
                category: 'InvalidCategory',
                sub_category: 'Test',
                colors: ['red'],
                style: 'casual',
                material: 'cotton',
                position_description: 'test',
                confidence: 80,
            }]),
        });

        const { result } = await extractionService.processJob('job-123');

        // Invalid category should be replaced with 'Tops'
        expect(result!.photos[0].detected_items[0].category).toBe('Tops');
    });
});

describe('flattenDetectedItems', () => {
    it('flattens items from all photos into single array', () => {
        const result: ExtractionJobResult = {
            photos: [
                {
                    photo_url: 'url1',
                    photo_index: 0,
                    detected_items: [
                        { category: 'Tops', sub_category: 'Shirt', colors: [], style: '', material: '', position_description: '', confidence: 90, photo_index: 0, photo_url: 'url1' },
                    ],
                    error: null,
                },
                {
                    photo_url: 'url2',
                    photo_index: 1,
                    detected_items: [
                        { category: 'Bottoms', sub_category: 'Jeans', colors: [], style: '', material: '', position_description: '', confidence: 85, photo_index: 1, photo_url: 'url2' },
                        { category: 'Shoes', sub_category: 'Boots', colors: [], style: '', material: '', position_description: '', confidence: 80, photo_index: 1, photo_url: 'url2' },
                    ],
                    error: null,
                },
            ],
            total_items_detected: 3,
            failed_photos: 0,
        };

        const flat = extractionService.flattenDetectedItems(result);
        expect(flat).toHaveLength(3);
        expect(flat[0].category).toBe('Tops');
        expect(flat[2].category).toBe('Shoes');
    });
});

describe('getCategorySummary', () => {
    it('returns correct count per category', () => {
        const result: ExtractionJobResult = {
            photos: [
                {
                    photo_url: 'url1',
                    photo_index: 0,
                    detected_items: [
                        { category: 'Tops', sub_category: 'Shirt', colors: [], style: '', material: '', position_description: '', confidence: 90, photo_index: 0, photo_url: 'url1' },
                        { category: 'Tops', sub_category: 'Sweater', colors: [], style: '', material: '', position_description: '', confidence: 85, photo_index: 0, photo_url: 'url1' },
                    ],
                    error: null,
                },
                {
                    photo_url: 'url2',
                    photo_index: 1,
                    detected_items: [
                        { category: 'Bottoms', sub_category: 'Jeans', colors: [], style: '', material: '', position_description: '', confidence: 80, photo_index: 1, photo_url: 'url2' },
                    ],
                    error: null,
                },
            ],
            total_items_detected: 3,
            failed_photos: 0,
        };

        const summary = extractionService.getCategorySummary(result);
        expect(summary).toEqual({ Tops: 2, Bottoms: 1 });
    });
});
