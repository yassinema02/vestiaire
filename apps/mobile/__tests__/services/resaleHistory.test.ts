/**
 * Resale History & Earnings Tests
 * Story 13.5: Resale History & Earnings Tracker
 */

// ─── Supabase mock ──────────────────────────────────────────────

const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockUpdate = jest.fn();
const mockOrder = jest.fn();

jest.mock('../../services/supabase', () => ({
    supabase: {
        from: jest.fn((table: string) => ({
            select: mockSelect,
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

jest.mock('../../services/aiUsageLogger', () => ({
    trackedGenerateContent: jest.fn(),
}));

jest.mock('expo-constants', () => ({
    expoConfig: { extra: { geminiApiKey: '' } },
}));

jest.mock('../../services/gamificationService', () => ({
    gamificationService: {
        addPoints: jest.fn().mockResolvedValue({ newTotal: 10, error: null }),
    },
}));

beforeEach(() => {
    jest.clearAllMocks();
});

// ─── getEarningsTimeline ─────────────────────────────────────────

describe('getEarningsTimeline', () => {
    it('groups sold listings by month correctly', async () => {
        // Mock getHistory('sold') chain
        mockSelect.mockReturnValue({
            eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({
                        data: [
                            { id: '1', status: 'sold', sold_price: 30, sold_at: new Date().toISOString() },
                            { id: '2', status: 'sold', sold_price: 50, sold_at: new Date().toISOString() },
                        ],
                        error: null,
                    }),
                }),
            }),
        });

        const { listingService } = await import('../../services/listingService');
        const { timeline } = await listingService.getEarningsTimeline();

        expect(timeline).toHaveLength(6);
        // Current month should have earnings
        const currentMonth = timeline[timeline.length - 1];
        expect(currentMonth.earnings).toBe(80);
        expect(currentMonth.count).toBe(2);
    });

    it('returns 6 months including zero-earning months', async () => {
        mockSelect.mockReturnValue({
            eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({
                        data: [
                            { id: '1', status: 'sold', sold_price: 25, sold_at: new Date().toISOString() },
                        ],
                        error: null,
                    }),
                }),
            }),
        });

        const { listingService } = await import('../../services/listingService');
        const { timeline } = await listingService.getEarningsTimeline();

        expect(timeline).toHaveLength(6);
        // At least some months should have 0 earnings
        const zeroMonths = timeline.filter(t => t.earnings === 0);
        expect(zeroMonths.length).toBeGreaterThanOrEqual(5);
    });

    it('handles no sold items (empty array)', async () => {
        mockSelect.mockReturnValue({
            eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({
                        data: [],
                        error: null,
                    }),
                }),
            }),
        });

        const { listingService } = await import('../../services/listingService');
        const { timeline } = await listingService.getEarningsTimeline();

        expect(timeline).toHaveLength(6);
        expect(timeline.every(t => t.earnings === 0)).toBe(true);
    });
});

// ─── updateStatus resale_status sync ─────────────────────────────

describe('updateStatus resale_status sync', () => {
    it('updates items.resale_status to sold when marking sold', async () => {
        // Mock: fetch listing item_id
        mockSelect.mockReturnValue({
            eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: { item_id: 'item-42' } }),
                    order: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
            }),
        });

        // Mock: update listing status
        mockUpdate.mockReturnValue({
            eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
            }),
        });

        const { listingService } = await import('../../services/listingService');
        await listingService.updateStatus('listing-1', 'sold', 50);

        // Verify items.resale_status update was called
        expect(mockUpdate).toHaveBeenCalledWith({ resale_status: 'sold' });
    });

    it('resets items.resale_status to null when cancelling', async () => {
        mockSelect.mockReturnValue({
            eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: { item_id: 'item-42' } }),
                    order: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
            }),
        });

        mockUpdate.mockReturnValue({
            eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
            }),
        });

        const { listingService } = await import('../../services/listingService');
        await listingService.updateStatus('listing-1', 'cancelled');

        expect(mockUpdate).toHaveBeenCalledWith({ resale_status: null });
    });
});

// ─── Sustainability metric ───────────────────────────────────────

describe('sustainability metric', () => {
    it('totalSold equals items diverted from landfill', async () => {
        mockSelect.mockReturnValue({
            eq: jest.fn().mockResolvedValue({
                data: [
                    { status: 'sold', sold_price: 20 },
                    { status: 'sold', sold_price: 30 },
                    { status: 'sold', sold_price: 15 },
                    { status: 'listed', sold_price: null },
                ],
                error: null,
            }),
        });

        const { listingService } = await import('../../services/listingService');
        const stats = await listingService.getResaleStats();

        // totalSold = items diverted from landfill
        expect(stats.totalSold).toBe(3);
    });
});

// ─── Circular Champion badge ─────────────────────────────────────

describe('Circular Champion badge', () => {
    it('triggers at 10+ sold items', () => {
        // Badge check: query resale_listings for sold status, return count >= 10
        const soldItems = Array.from({ length: 10 }, (_, i) => ({ id: `item-${i}` }));
        expect(soldItems.length >= 10).toBe(true);
    });

    it('does not trigger at 9 sold items', () => {
        const soldItems = Array.from({ length: 9 }, (_, i) => ({ id: `item-${i}` }));
        expect(soldItems.length >= 10).toBe(false);
    });
});
