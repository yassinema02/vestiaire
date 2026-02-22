/**
 * OOTD Service Tests
 * Story 9.2: OOTD Posting Flow
 */

// Mock Supabase
const mockFrom = jest.fn();
const mockStorage = {
    from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: { path: 'user/123.jpg' }, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/photo.jpg' } }),
        remove: jest.fn().mockResolvedValue({ error: null }),
    })),
};

jest.mock('../../services/supabase', () => ({
    supabase: {
        from: mockFrom,
        storage: mockStorage,
        auth: {
            getUser: jest.fn().mockResolvedValue({
                data: { user: { id: 'test-user-id' } },
            }),
        },
    },
}));

jest.mock('../../services/auth-helpers', () => ({
    requireUserId: jest.fn().mockResolvedValue('test-user-id'),
}));

// Mock fetch for photo upload
global.fetch = jest.fn().mockResolvedValue({
    blob: jest.fn().mockResolvedValue(new Blob(['photo'], { type: 'image/jpeg' })),
});

global.Response = class MockResponse {
    private body: any;
    constructor(body: any) { this.body = body; }
    arrayBuffer() { return Promise.resolve(new ArrayBuffer(8)); }
} as any;

import { ootdService } from '../../services/ootdService';

describe('ootdService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('uploadOotdPhoto', () => {
        it('should upload to ootd-photos bucket with correct path format', async () => {
            const result = await ootdService.uploadOotdPhoto('user-123', 'file:///photo.jpg');

            expect(mockStorage.from).toHaveBeenCalledWith('ootd-photos');
            expect(result.url).toBeTruthy();
            expect(result.error).toBeNull();
        });
    });

    describe('createPost', () => {
        it('should upload photo once and create one row per squad', async () => {
            const mockInsert = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn()
                        .mockResolvedValueOnce({
                            data: { id: 'post-1', squad_id: 'squad-a', photo_url: 'https://example.com/photo.jpg' },
                            error: null,
                        })
                        .mockResolvedValueOnce({
                            data: { id: 'post-2', squad_id: 'squad-b', photo_url: 'https://example.com/photo.jpg' },
                            error: null,
                        }),
                }),
            });

            mockFrom.mockReturnValue({
                insert: mockInsert,
                select: jest.fn().mockReturnThis(),
                single: jest.fn(),
            });

            const result = await ootdService.createPost({
                photo_uri: 'file:///photo.jpg',
                caption: 'My outfit today',
                squad_ids: ['squad-a', 'squad-b'],
            });

            expect(result.error).toBeNull();
            expect(result.posts).toHaveLength(2);
            // Photo uploaded once (via storage mock)
            expect(mockStorage.from).toHaveBeenCalledTimes(1);
        });

        it('should store caption as null when empty', async () => {
            const mockInsert = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: { id: 'post-1', caption: null },
                        error: null,
                    }),
                }),
            });

            mockFrom.mockReturnValue({ insert: mockInsert });

            await ootdService.createPost({
                photo_uri: 'file:///photo.jpg',
                caption: '',
                squad_ids: ['squad-a'],
            });

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({ caption: null })
            );
        });

        it('should store tagged item IDs as array', async () => {
            const mockInsert = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: { id: 'post-1', tagged_item_ids: ['item-1', 'item-2'] },
                        error: null,
                    }),
                }),
            });

            mockFrom.mockReturnValue({ insert: mockInsert });

            await ootdService.createPost({
                photo_uri: 'file:///photo.jpg',
                tagged_item_ids: ['item-1', 'item-2'],
                squad_ids: ['squad-a'],
            });

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    tagged_item_ids: ['item-1', 'item-2'],
                })
            );
        });
    });

    describe('getSquadFeed', () => {
        it('should return posts ordered by created_at DESC with author data', async () => {
            const mockData = [
                {
                    id: 'post-1',
                    user_id: 'user-a',
                    squad_id: 'squad-1',
                    photo_url: 'https://example.com/1.jpg',
                    caption: 'Hello',
                    tagged_item_ids: [],
                    reaction_count: 0,
                    comment_count: 0,
                    created_at: '2026-02-20T12:00:00Z',
                    profiles: { display_name: 'Alice', avatar_url: null },
                },
            ];

            mockFrom.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockReturnValue({
                            limit: jest.fn().mockResolvedValue({ data: mockData, error: null }),
                        }),
                    }),
                }),
            });

            const { posts, error } = await ootdService.getSquadFeed('squad-1');

            expect(error).toBeNull();
            expect(posts).toHaveLength(1);
            expect(posts[0].author_display_name).toBe('Alice');
        });
    });

    describe('deletePost', () => {
        it('should delete the DB row', async () => {
            const mockDelete = jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
            });

            mockFrom.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: { photo_url: 'https://example.com/ootd-photos/user/123.jpg', user_id: 'test-user-id' },
                            error: null,
                        }),
                    }),
                }),
                delete: mockDelete,
            });

            const result = await ootdService.deletePost('post-1');
            expect(result.error).toBeNull();
        });
    });
});
