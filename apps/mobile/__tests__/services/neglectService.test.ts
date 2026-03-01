/**
 * Neglect Service Tests
 * Story 13.1: Enhanced Neglect Detection
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

const mockRpc = jest.fn().mockResolvedValue({ error: null });

jest.mock('../../services/supabase', () => ({
    supabase: {
        rpc: mockRpc,
    },
}));

// ─── secure storage mock (needed by supabase import chain) ──────

jest.mock('../../services/secureStorage', () => ({
    secureStorageAdapter: {},
}));

import { neglectService, NeglectStats } from '../../services/neglectService';
import { isNeglected, isNeglectedFromDb, NEGLECTED_THRESHOLD_DAYS } from '../../utils/neglectedItems';
import { WardrobeItem } from '../../services/items';

// Helper to create a test item
function makeItem(overrides: Partial<WardrobeItem> = {}): WardrobeItem {
    return {
        id: 'item-1',
        user_id: 'user-1',
        image_url: 'https://example.com/img.jpg',
        wear_count: 0,
        is_favorite: false,
        status: 'complete',
        created_at: new Date(Date.now() - 200 * 86400000).toISOString(), // 200 days ago
        updated_at: new Date().toISOString(),
        ...overrides,
    };
}

beforeEach(() => {
    // Clear mock storage between tests
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    mockRpc.mockClear();
});

describe('neglectService.getNeglectThreshold', () => {
    it('returns 180 as default when nothing is stored', async () => {
        const threshold = await neglectService.getNeglectThreshold();
        expect(threshold).toBe(180);
    });

    it('returns stored value when set', async () => {
        mockStorage['neglect_threshold_days'] = '90';
        const threshold = await neglectService.getNeglectThreshold();
        expect(threshold).toBe(90);
    });

    it('returns default for invalid stored values', async () => {
        mockStorage['neglect_threshold_days'] = 'abc';
        expect(await neglectService.getNeglectThreshold()).toBe(180);

        mockStorage['neglect_threshold_days'] = '10'; // below min
        expect(await neglectService.getNeglectThreshold()).toBe(180);

        mockStorage['neglect_threshold_days'] = '500'; // above max
        expect(await neglectService.getNeglectThreshold()).toBe(180);
    });
});

describe('neglectService.setNeglectThreshold', () => {
    it('saves valid threshold', async () => {
        await neglectService.setNeglectThreshold(90);
        expect(mockStorage['neglect_threshold_days']).toBe('90');
    });

    it('rejects threshold below 30', async () => {
        await expect(neglectService.setNeglectThreshold(10)).rejects.toThrow(
            'Threshold must be between 30 and 365 days'
        );
    });

    it('rejects threshold above 365', async () => {
        await expect(neglectService.setNeglectThreshold(400)).rejects.toThrow(
            'Threshold must be between 30 and 365 days'
        );
    });
});

describe('neglectService.getNeglectStats', () => {
    it('computes correct percentage and label', () => {
        const items = [
            makeItem({ id: '1', neglect_status: true }),
            makeItem({ id: '2', neglect_status: true }),
            makeItem({ id: '3', neglect_status: false }),
            makeItem({ id: '4', neglect_status: false }),
            makeItem({ id: '5', neglect_status: false }),
            makeItem({ id: '6', neglect_status: false }),
            makeItem({ id: '7', neglect_status: false }),
            makeItem({ id: '8', neglect_status: false }),
            makeItem({ id: '9', neglect_status: false }),
            makeItem({ id: '10', neglect_status: false }),
        ];
        const stats = neglectService.getNeglectStats(items);
        expect(stats.neglectedCount).toBe(2);
        expect(stats.totalCount).toBe(10);
        expect(stats.percentage).toBe(20);
        expect(stats.label).toContain('20%');
        expect(stats.label).toContain('2 items');
    });

    it('returns "No neglected items" when none are neglected', () => {
        const items = [
            makeItem({ id: '1', neglect_status: false }),
            makeItem({ id: '2', neglect_status: false }),
        ];
        const stats = neglectService.getNeglectStats(items);
        expect(stats.neglectedCount).toBe(0);
        expect(stats.percentage).toBe(0);
        expect(stats.label).toBe('No neglected items');
    });

    it('excludes non-complete items from stats', () => {
        const items = [
            makeItem({ id: '1', neglect_status: true, status: 'pending' }),
            makeItem({ id: '2', neglect_status: false }),
        ];
        const stats = neglectService.getNeglectStats(items);
        expect(stats.totalCount).toBe(1);
        expect(stats.neglectedCount).toBe(0);
    });

    it('returns top 3 neglected items sorted by most neglected', () => {
        const items = [
            makeItem({ id: '1', neglect_status: true, last_worn_at: new Date(Date.now() - 300 * 86400000).toISOString() }),
            makeItem({ id: '2', neglect_status: true, last_worn_at: new Date(Date.now() - 200 * 86400000).toISOString() }),
            makeItem({ id: '3', neglect_status: true, last_worn_at: new Date(Date.now() - 250 * 86400000).toISOString() }),
            makeItem({ id: '4', neglect_status: true }), // never worn — should come first
            makeItem({ id: '5', neglect_status: false }),
        ];
        const stats = neglectService.getNeglectStats(items);
        expect(stats.topNeglected.length).toBe(3);
        // Never-worn item first (Infinity days), then 300d, then 250d
        expect(stats.topNeglected[0].id).toBe('4');
        expect(stats.topNeglected[1].id).toBe('1');
        expect(stats.topNeglected[2].id).toBe('3');
    });
});

describe('neglectService.computeNeglectStatuses', () => {
    it('calls RPC with correct threshold', async () => {
        mockStorage['neglect_threshold_days'] = '120';
        await neglectService.computeNeglectStatuses(true);
        expect(mockRpc).toHaveBeenCalledWith('update_neglect_statuses', {
            threshold_days: 120,
        });
    });

    it('debounces when called within 24h', async () => {
        // First call should execute
        await neglectService.computeNeglectStatuses(true);
        expect(mockRpc).toHaveBeenCalledTimes(1);

        // Second call (not forced) should be debounced
        await neglectService.computeNeglectStatuses(false);
        expect(mockRpc).toHaveBeenCalledTimes(1); // still 1
    });
});

describe('isNeglected utility', () => {
    it('uses 180-day default threshold', () => {
        expect(NEGLECTED_THRESHOLD_DAYS).toBe(180);
    });

    it('returns true for item last worn 200 days ago (180 threshold)', () => {
        const item = makeItem({
            last_worn_at: new Date(Date.now() - 200 * 86400000).toISOString(),
        });
        expect(isNeglected(item)).toBe(true);
    });

    it('returns false for item last worn 100 days ago (180 threshold)', () => {
        const item = makeItem({
            last_worn_at: new Date(Date.now() - 100 * 86400000).toISOString(),
        });
        expect(isNeglected(item)).toBe(false);
    });
});

describe('isNeglectedFromDb', () => {
    it('reads neglect_status field directly', () => {
        expect(isNeglectedFromDb(makeItem({ neglect_status: true }))).toBe(true);
        expect(isNeglectedFromDb(makeItem({ neglect_status: false }))).toBe(false);
        expect(isNeglectedFromDb(makeItem({ neglect_status: undefined }))).toBe(false);
    });
});
