/**
 * Engagement Service Tests
 * Story 9.4: Reactions & Comments
 */

const mockFrom = jest.fn();

jest.mock('../../services/supabase', () => ({
    supabase: {
        from: mockFrom,
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

import { engagementService } from '../../services/engagementService';

// Helper to build chainable Supabase query mock
function buildChain(overrides: Record<string, any> = {}) {
    const chain: any = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        ...overrides,
    };
    return chain;
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('engagementService', () => {
    describe('toggleReaction', () => {
        it('should insert reaction when user has not reacted', async () => {
            const chain = buildChain();
            mockFrom.mockReturnValue(chain);

            const result = await engagementService.toggleReaction('post-1');

            expect(result.reacted).toBe(true);
            expect(result.error).toBeNull();
        });

        it('should delete reaction when user has already reacted', async () => {
            const chain = buildChain({
                maybeSingle: jest.fn().mockResolvedValue({
                    data: { id: 'reaction-1' },
                    error: null,
                }),
            });
            mockFrom.mockReturnValue(chain);

            const result = await engagementService.toggleReaction('post-1');

            expect(result.reacted).toBe(false);
            expect(result.error).toBeNull();
        });
    });

    describe('getUserReactions', () => {
        it('should return boolean map of user reactions', async () => {
            const chain = buildChain();
            // The final resolved value after chaining .in()
            chain.in.mockResolvedValue({
                data: [{ post_id: 'post-1' }, { post_id: 'post-3' }],
                error: null,
            });
            mockFrom.mockReturnValue(chain);

            const result = await engagementService.getUserReactions([
                'post-1',
                'post-2',
                'post-3',
            ]);

            expect(result['post-1']).toBe(true);
            expect(result['post-2']).toBe(false);
            expect(result['post-3']).toBe(true);
        });

        it('should return all false for empty post IDs', async () => {
            const result = await engagementService.getUserReactions([]);
            expect(result).toEqual({});
        });
    });

    describe('getPostComments', () => {
        it('should return comments with author data ordered ASC', async () => {
            const mockComments = [
                {
                    id: 'c1',
                    post_id: 'post-1',
                    user_id: 'user-a',
                    text: 'Great outfit!',
                    created_at: '2026-02-20T10:00:00Z',
                    profiles: { display_name: 'Alice', avatar_url: null },
                },
                {
                    id: 'c2',
                    post_id: 'post-1',
                    user_id: 'user-b',
                    text: 'Love it!',
                    created_at: '2026-02-20T11:00:00Z',
                    profiles: { display_name: 'Bob', avatar_url: null },
                },
            ];

            const chain = buildChain({
                limit: jest.fn().mockResolvedValue({
                    data: mockComments,
                    error: null,
                }),
            });
            mockFrom.mockReturnValue(chain);

            const { comments, error } = await engagementService.getPostComments('post-1');

            expect(error).toBeNull();
            expect(comments).toHaveLength(2);
            expect(comments[0].author_display_name).toBe('Alice');
            expect(comments[1].text).toBe('Love it!');
        });
    });

    describe('addComment', () => {
        it('should create comment with valid text', async () => {
            const chain = buildChain({
                single: jest.fn().mockResolvedValue({
                    data: {
                        id: 'c-new',
                        post_id: 'post-1',
                        user_id: 'test-user-id',
                        text: 'Nice!',
                        created_at: '2026-02-22T12:00:00Z',
                        profiles: { display_name: 'Test User', avatar_url: null },
                    },
                    error: null,
                }),
            });
            mockFrom.mockReturnValue(chain);

            const { comment, error } = await engagementService.addComment('post-1', 'Nice!');

            expect(error).toBeNull();
            expect(comment).not.toBeNull();
            expect(comment!.text).toBe('Nice!');
        });

        it('should reject empty comment', async () => {
            const { comment, error } = await engagementService.addComment('post-1', '   ');

            expect(comment).toBeNull();
            expect(error).not.toBeNull();
            expect(error!.message).toContain('1-200 characters');
        });

        it('should reject comment exceeding 200 characters', async () => {
            const longText = 'a'.repeat(201);
            const { comment, error } = await engagementService.addComment('post-1', longText);

            expect(comment).toBeNull();
            expect(error).not.toBeNull();
        });
    });

    describe('deleteComment', () => {
        it('should delete comment successfully', async () => {
            const chain = buildChain();
            chain.eq.mockResolvedValue({ error: null });
            mockFrom.mockReturnValue(chain);

            const { error } = await engagementService.deleteComment('c-1');

            expect(error).toBeNull();
        });
    });
});
