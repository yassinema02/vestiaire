/**
 * Bulk Upload Service Tests
 * Story 10.1: Bulk Photo Upload
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

jest.mock('expo-image-picker', () => ({
    launchImageLibraryAsync: jest.fn(),
    MediaTypeOptions: { Images: 'Images' },
}));

// Mock global fetch for photo upload
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { bulkUploadService } from '../../services/bulkUploadService';
import * as ImagePicker from 'expo-image-picker';

function buildChain(overrides = {}) {
    const chain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        ...overrides,
    };
    return chain;
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('selectPhotos', () => {
    it('returns array of URIs from picker', async () => {
        const mockLaunch = ImagePicker.launchImageLibraryAsync as jest.Mock;
        mockLaunch.mockResolvedValue({
            canceled: false,
            assets: [
                { uri: 'file:///photo1.jpg' },
                { uri: 'file:///photo2.jpg' },
                { uri: 'file:///photo3.jpg' },
            ],
        });

        const result = await bulkUploadService.selectPhotos();

        expect(result).toEqual([
            'file:///photo1.jpg',
            'file:///photo2.jpg',
            'file:///photo3.jpg',
        ]);
        expect(mockLaunch).toHaveBeenCalledWith(
            expect.objectContaining({
                allowsMultipleSelection: true,
                selectionLimit: 50,
            })
        );
    });

    it('returns empty array when user cancels', async () => {
        const mockLaunch = ImagePicker.launchImageLibraryAsync as jest.Mock;
        mockLaunch.mockResolvedValue({ canceled: true, assets: [] });

        const result = await bulkUploadService.selectPhotos();

        expect(result).toEqual([]);
    });
});

describe('uploadBatch', () => {
    it('tracks progress correctly through all photos', async () => {
        const photos = ['file:///p1.jpg', 'file:///p2.jpg', 'file:///p3.jpg'];
        const progressUpdates: any[] = [];

        // Mock fetch for photo data
        mockFetch.mockResolvedValue({
            arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
        });

        // Mock Response constructor for arrayBuffer conversion
        global.Response = jest.fn().mockImplementation(() => ({
            arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
        })) as any;

        // Mock storage upload
        mockStorageFrom.mockReturnValue({
            upload: jest.fn().mockResolvedValue({
                data: { path: 'test-user-id/123_0.jpg' },
                error: null,
            }),
            getPublicUrl: jest.fn().mockReturnValue({
                data: { publicUrl: 'https://storage.test/photo.jpg' },
            }),
        });

        const { urls, error } = await bulkUploadService.uploadBatch(
            photos,
            (p) => progressUpdates.push({ ...p })
        );

        expect(error).toBeNull();
        expect(urls).toHaveLength(3);

        // Verify progress was called for each photo + final 100%
        expect(progressUpdates.length).toBe(4);
        expect(progressUpdates[0].percentage).toBe(0);
        expect(progressUpdates[0].uploaded).toBe(0);
        expect(progressUpdates[3].percentage).toBe(100);
        expect(progressUpdates[3].uploaded).toBe(3);
    });

    it('skips failed uploads without breaking batch', async () => {
        const photos = ['file:///p1.jpg', 'file:///p2.jpg'];

        mockFetch.mockResolvedValue({
            arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
        });

        global.Response = jest.fn().mockImplementation(() => ({
            arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
        })) as any;

        let callCount = 0;
        mockStorageFrom.mockReturnValue({
            upload: jest.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return Promise.resolve({ data: null, error: { message: 'Upload failed' } });
                }
                return Promise.resolve({
                    data: { path: 'test-user-id/123_1.jpg' },
                    error: null,
                });
            }),
            getPublicUrl: jest.fn().mockReturnValue({
                data: { publicUrl: 'https://storage.test/photo2.jpg' },
            }),
        });

        const { urls, error } = await bulkUploadService.uploadBatch(
            photos,
            () => {}
        );

        expect(error).toBeNull();
        expect(urls).toHaveLength(1);
    });
});

describe('createExtractionJob', () => {
    it('creates job with correct data', async () => {
        const mockJob = {
            id: 'job-123',
            user_id: 'test-user-id',
            photo_urls: ['url1', 'url2'],
            total_photos: 2,
            processed_photos: 0,
            status: 'pending',
        };

        const chain = buildChain({
            single: jest.fn().mockResolvedValue({ data: mockJob, error: null }),
        });
        mockFrom.mockReturnValue(chain);

        const { job, error } = await bulkUploadService.createExtractionJob([
            'url1',
            'url2',
        ]);

        expect(error).toBeNull();
        expect(job).toEqual(mockJob);
        expect(chain.insert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'test-user-id',
                photo_urls: ['url1', 'url2'],
                total_photos: 2,
                status: 'pending',
            })
        );
    });
});

describe('getEstimatedTime', () => {
    it('returns ~1 minute for 10 photos', () => {
        expect(bulkUploadService.getEstimatedTime(10)).toBe('~1 minute');
    });

    it('returns ~2 minutes for 20 photos', () => {
        expect(bulkUploadService.getEstimatedTime(20)).toBe('~2 minutes');
    });

    it('returns ~5 minutes for 50 photos', () => {
        expect(bulkUploadService.getEstimatedTime(50)).toBe('~5 minutes');
    });

    it('returns ~1 minute for 1 photo', () => {
        expect(bulkUploadService.getEstimatedTime(1)).toBe('~1 minute');
    });
});

describe('getJob', () => {
    it('fetches job by ID', async () => {
        const mockJob = { id: 'job-123', status: 'processing' };
        const chain = buildChain({
            single: jest.fn().mockResolvedValue({ data: mockJob, error: null }),
        });
        mockFrom.mockReturnValue(chain);

        const { job, error } = await bulkUploadService.getJob('job-123');

        expect(error).toBeNull();
        expect(job).toEqual(mockJob);
        expect(chain.eq).toHaveBeenCalledWith('id', 'job-123');
    });
});

describe('getUserJobs', () => {
    it('fetches all jobs for user ordered by created_at desc', async () => {
        const mockJobs = [
            { id: 'job-2', status: 'completed' },
            { id: 'job-1', status: 'pending' },
        ];
        const chain = buildChain();
        chain.order = jest.fn().mockResolvedValue({ data: mockJobs, error: null });
        mockFrom.mockReturnValue(chain);

        const { jobs, error } = await bulkUploadService.getUserJobs();

        expect(error).toBeNull();
        expect(jobs).toEqual(mockJobs);
        expect(chain.eq).toHaveBeenCalledWith('user_id', 'test-user-id');
        expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
});
