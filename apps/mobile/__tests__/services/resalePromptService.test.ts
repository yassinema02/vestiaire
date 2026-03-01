/**
 * Resale Prompt Service Tests
 * Story 13.2: Resale Prompt Notifications
 */

// ─── AsyncStorage mock ───────────────────────────────────────────

const mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
        mockStorage[key] = value;
        return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
        delete mockStorage[key];
        return Promise.resolve();
    }),
}));

// ─── Supabase mock ──────────────────────────────────────────────

const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockGte = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();

jest.mock('../../services/supabase', () => ({
    supabase: {
        from: jest.fn((table: string) => ({
            select: mockSelect,
            insert: mockInsert,
            update: mockUpdate,
        })),
        auth: {
            getUser: jest.fn().mockResolvedValue({
                data: { user: { id: 'user-123' } },
            }),
        },
    },
}));

jest.mock('../../services/secureStorage', () => ({
    secureStorageAdapter: {},
}));

import { estimateResalePrice, resalePromptService, ResalePrompt } from '../../services/resalePromptService';
import { WardrobeItem } from '../../services/items';

// Helper to create a test item
function makeItem(overrides: Partial<WardrobeItem> = {}): WardrobeItem {
    return {
        id: 'item-1',
        user_id: 'user-123',
        image_url: 'https://example.com/img.jpg',
        wear_count: 0,
        is_favorite: false,
        status: 'complete',
        created_at: new Date(Date.now() - 200 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        neglect_status: true,
        ...overrides,
    };
}

beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    jest.clearAllMocks();

    // Default: profiles query returns enabled
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle, gte: mockGte });
    mockSingle.mockResolvedValue({ data: { resale_prompts_enabled: true } });
    mockGte.mockResolvedValue({ data: [] }); // no recent prompts
    mockInsert.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
});

// ─── estimateResalePrice ─────────────────────────────────────────

describe('estimateResalePrice', () => {
    it('returns ~70% retention for premium brand with purchase price', () => {
        const item = makeItem({ purchase_price: 200, brand: 'Gucci', wear_count: 0 });
        const price = estimateResalePrice(item);
        expect(price).toBe(140); // 200 * 0.7 = 140
    });

    it('returns ~50% retention for unknown brand', () => {
        const item = makeItem({ purchase_price: 100, brand: 'NoName', wear_count: 0 });
        const price = estimateResalePrice(item);
        expect(price).toBe(50); // 100 * 0.5 = 50
    });

    it('returns £15 default when no purchase price', () => {
        const item = makeItem({ purchase_price: undefined });
        expect(estimateResalePrice(item)).toBe(15);
    });

    it('returns £15 default when purchase price is 0', () => {
        const item = makeItem({ purchase_price: 0 });
        expect(estimateResalePrice(item)).toBe(15);
    });

    it('reduces price based on wear count (condition proxy)', () => {
        const item = makeItem({ purchase_price: 200, brand: 'Gucci', wear_count: 20 });
        const price = estimateResalePrice(item);
        // 200 * 0.7 = 140, then 140 * (1 - 0.20) = 112
        expect(price).toBe(112);
    });

    it('caps wear reduction at 30%', () => {
        const item = makeItem({ purchase_price: 200, brand: 'Gucci', wear_count: 100 });
        const price = estimateResalePrice(item);
        // 200 * 0.7 = 140, then 140 * (1 - 0.30) = 98
        expect(price).toBe(98);
    });

    it('enforces minimum price of £5', () => {
        const item = makeItem({ purchase_price: 5, brand: 'NoName', wear_count: 50 });
        const price = estimateResalePrice(item);
        // 5 * 0.5 = 2.5, then 2.5 * 0.7 = 1.75, rounds to 2, but min is 5
        expect(price).toBe(5);
    });
});

// ─── getResalePrompts ────────────────────────────────────────────

describe('getResalePrompts', () => {
    it('filters out non-neglected items', async () => {
        const items = [
            makeItem({ id: 'a', neglect_status: true }),
            makeItem({ id: 'b', neglect_status: false }),
        ];
        const prompts = await resalePromptService.getResalePrompts(items);
        expect(prompts.length).toBe(1);
        expect(prompts[0].item.id).toBe('a');
    });

    it('filters out items prompted this month', async () => {
        // Simulate item 'a' was prompted recently
        mockGte.mockResolvedValue({ data: [{ item_id: 'a' }] });

        const items = [
            makeItem({ id: 'a', neglect_status: true }),
            makeItem({ id: 'b', neglect_status: true }),
        ];
        const prompts = await resalePromptService.getResalePrompts(items);
        expect(prompts.length).toBe(1);
        expect(prompts[0].item.id).toBe('b');
    });

    it('filters out dismissed items', async () => {
        // Pre-dismiss item 'a'
        mockStorage['dismissed_resale_prompts_user-123'] = JSON.stringify(['a']);

        const items = [
            makeItem({ id: 'a', neglect_status: true }),
            makeItem({ id: 'b', neglect_status: true }),
        ];
        const prompts = await resalePromptService.getResalePrompts(items);
        expect(prompts.length).toBe(1);
        expect(prompts[0].item.id).toBe('b');
    });

    it('returns max 3 prompts', async () => {
        const items = Array.from({ length: 5 }, (_, i) =>
            makeItem({ id: `item-${i}`, neglect_status: true })
        );
        const prompts = await resalePromptService.getResalePrompts(items);
        expect(prompts.length).toBe(3);
    });

    it('returns empty when globally disabled', async () => {
        mockSingle.mockResolvedValue({ data: { resale_prompts_enabled: false } });

        const items = [makeItem({ neglect_status: true })];
        const prompts = await resalePromptService.getResalePrompts(items);
        expect(prompts.length).toBe(0);
    });

    it('filters out non-complete items', async () => {
        const items = [
            makeItem({ id: 'a', neglect_status: true, status: 'pending' }),
            makeItem({ id: 'b', neglect_status: true, status: 'complete' }),
        ];
        const prompts = await resalePromptService.getResalePrompts(items);
        expect(prompts.length).toBe(1);
        expect(prompts[0].item.id).toBe('b');
    });
});

// ─── dismissPrompt ───────────────────────────────────────────────

describe('dismissPrompt', () => {
    it('adds item to AsyncStorage dismissed set', async () => {
        await resalePromptService.dismissPrompt('item-42');

        const stored = JSON.parse(mockStorage['dismissed_resale_prompts_user-123']);
        expect(stored).toContain('item-42');
    });

    it('logs action=dismissed in prompt_log', async () => {
        await resalePromptService.dismissPrompt('item-42');

        expect(mockInsert).toHaveBeenCalledWith({
            user_id: 'user-123',
            item_id: 'item-42',
            action: 'dismissed',
        });
    });
});

// ─── recordPromptShown ───────────────────────────────────────────

describe('recordPromptShown', () => {
    it('logs action=shown in prompt_log', async () => {
        await resalePromptService.recordPromptShown('item-7');

        expect(mockInsert).toHaveBeenCalledWith({
            user_id: 'user-123',
            item_id: 'item-7',
            action: 'shown',
        });
    });
});

// ─── clearDismissals ─────────────────────────────────────────────

describe('clearDismissals', () => {
    it('removes dismissed set from AsyncStorage', async () => {
        mockStorage['dismissed_resale_prompts_user-123'] = JSON.stringify(['a', 'b']);

        await resalePromptService.clearDismissals();

        expect(mockStorage['dismissed_resale_prompts_user-123']).toBeUndefined();
    });
});

// ─── isGloballyEnabled ──────────────────────────────────────────

describe('isGloballyEnabled', () => {
    it('returns true when profile has resale_prompts_enabled=true', async () => {
        mockSingle.mockResolvedValue({ data: { resale_prompts_enabled: true } });
        expect(await resalePromptService.isGloballyEnabled()).toBe(true);
    });

    it('returns false when profile has resale_prompts_enabled=false', async () => {
        mockSingle.mockResolvedValue({ data: { resale_prompts_enabled: false } });
        expect(await resalePromptService.isGloballyEnabled()).toBe(false);
    });

    it('defaults to true on error', async () => {
        mockSelect.mockImplementation(() => { throw new Error('DB error'); });
        expect(await resalePromptService.isGloballyEnabled()).toBe(true);
    });
});

// ─── setGloballyEnabled ─────────────────────────────────────────

describe('setGloballyEnabled', () => {
    it('updates profiles table', async () => {
        await resalePromptService.setGloballyEnabled(false);

        expect(mockUpdate).toHaveBeenCalledWith({ resale_prompts_enabled: false });
    });
});
