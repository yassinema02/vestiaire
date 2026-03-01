/**
 * Health Score & Spring Clean Tests
 * Story 13.4: Wardrobe Health Score
 */

// ─── Supabase mock ──────────────────────────────────────────────

const mockUpdate = jest.fn();
const mockIn = jest.fn();

jest.mock('../../services/supabase', () => ({
    supabase: {
        from: jest.fn(() => ({
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

jest.mock('../../services/gamificationService', () => ({
    gamificationService: {
        addPoints: jest.fn().mockResolvedValue({ newTotal: 10, error: null }),
    },
}));

import { calculateHealthScore, HealthScore } from '../../services/analyticsService';
import { springCleanService } from '../../services/springCleanService';
import { gamificationService } from '../../services/gamificationService';
import { WardrobeItem } from '../../services/items';

function makeItem(overrides: Partial<WardrobeItem> = {}): WardrobeItem {
    return {
        id: `item-${Math.random().toString(36).slice(2, 6)}`,
        user_id: 'user-123',
        image_url: 'https://example.com/img.jpg',
        wear_count: 5,
        is_favorite: false,
        status: 'complete',
        created_at: new Date(Date.now() - 200 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        last_worn_at: new Date(Date.now() - 30 * 86400000).toISOString(), // 30 days ago
        purchase_price: 50,
        neglect_status: false,
        ...overrides,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockReturnValue({ in: mockIn });
    mockIn.mockResolvedValue({ error: null });
});

// ─── calculateHealthScore ────────────────────────────────────────

describe('calculateHealthScore', () => {
    it('returns high score for 100% utilization, good CPW, no neglect', () => {
        const items = Array.from({ length: 10 }, () =>
            makeItem({
                last_worn_at: new Date(Date.now() - 10 * 86400000).toISOString(), // 10 days ago
                purchase_price: 20,
                wear_count: 10, // CPW = 2 < 5
                neglect_status: false,
            })
        );
        const result = calculateHealthScore(items);
        expect(result.score).toBeGreaterThanOrEqual(90);
        expect(result.tier).toBe('excellent');
    });

    it('returns low score for 0% utilization, bad CPW, all neglected', () => {
        const items = Array.from({ length: 10 }, () =>
            makeItem({
                last_worn_at: new Date(Date.now() - 200 * 86400000).toISOString(), // 200 days ago
                purchase_price: 100,
                wear_count: 1, // CPW = 100 > 5
                neglect_status: true,
            })
        );
        const result = calculateHealthScore(items);
        expect(result.score).toBeLessThan(50);
        expect(result.tier).toBe('poor');
    });

    it('returns mixed score for mixed factors', () => {
        const items = [
            // 5 active items with good CPW
            ...Array.from({ length: 5 }, () =>
                makeItem({
                    last_worn_at: new Date(Date.now() - 10 * 86400000).toISOString(),
                    purchase_price: 20, wear_count: 10, neglect_status: false,
                })
            ),
            // 5 neglected items with bad CPW
            ...Array.from({ length: 5 }, () =>
                makeItem({
                    last_worn_at: new Date(Date.now() - 200 * 86400000).toISOString(),
                    purchase_price: 100, wear_count: 1, neglect_status: true,
                })
            ),
        ];
        const result = calculateHealthScore(items);
        expect(result.score).toBeGreaterThanOrEqual(30);
        expect(result.score).toBeLessThanOrEqual(70);
        expect(result.tier).toBe('good');
    });

    it('CPW factor defaults to 50 when no items have price', () => {
        const items = Array.from({ length: 5 }, () =>
            makeItem({
                purchase_price: undefined,
                wear_count: 0,
                last_worn_at: new Date(Date.now() - 10 * 86400000).toISOString(),
                neglect_status: false,
            })
        );
        const result = calculateHealthScore(items);
        expect(result.cpwFactor).toBe(50);
    });

    it('classifies tier correctly at boundaries', () => {
        // All active, good CPW, no neglect → score ~100 → excellent
        const excellentItems = Array.from({ length: 10 }, () =>
            makeItem({
                last_worn_at: new Date().toISOString(),
                purchase_price: 10, wear_count: 10,
                neglect_status: false,
            })
        );
        expect(calculateHealthScore(excellentItems).tier).toBe('excellent');
    });

    it('assigns correct colors per tier', () => {
        const greenItems = Array.from({ length: 5 }, () =>
            makeItem({ last_worn_at: new Date().toISOString(), purchase_price: 10, wear_count: 10, neglect_status: false })
        );
        expect(calculateHealthScore(greenItems).color).toBe('#22c55e');

        const redItems = Array.from({ length: 5 }, () =>
            makeItem({ last_worn_at: null as any, purchase_price: 100, wear_count: 1, neglect_status: true })
        );
        expect(calculateHealthScore(redItems).color).toBe('#ef4444');
    });

    it('recommends declutter when utilization < 70%', () => {
        const items = [
            // 2 active out of 10 = 20% utilization
            ...Array.from({ length: 2 }, () => makeItem({ last_worn_at: new Date().toISOString(), neglect_status: false })),
            ...Array.from({ length: 8 }, () => makeItem({ last_worn_at: null as any, neglect_status: true })),
        ];
        const result = calculateHealthScore(items);
        expect(result.recommendation).toContain('Declutter');
        expect(result.declutterCount).toBe(8);
    });

    it('says keep it up when utilization >= 85%', () => {
        const items = Array.from({ length: 10 }, () =>
            makeItem({ last_worn_at: new Date().toISOString(), neglect_status: false })
        );
        const result = calculateHealthScore(items);
        expect(result.recommendation).toContain('keep it up');
        expect(result.declutterCount).toBe(0);
    });

    it('returns correct comparison labels per score range', () => {
        // High score → ~95%
        const highItems = Array.from({ length: 10 }, () =>
            makeItem({ last_worn_at: new Date().toISOString(), purchase_price: 10, wear_count: 10, neglect_status: false })
        );
        const high = calculateHealthScore(highItems);
        expect(high.comparisonLabel).toContain('95%');

        // Low score → room for improvement
        const lowItems = Array.from({ length: 10 }, () =>
            makeItem({ last_worn_at: null as any, purchase_price: 100, wear_count: 1, neglect_status: true })
        );
        const low = calculateHealthScore(lowItems);
        expect(low.comparisonLabel).toBe('Room for improvement');
    });

    it('returns 0 score for empty wardrobe', () => {
        const result = calculateHealthScore([]);
        expect(result.score).toBe(0);
        expect(result.tier).toBe('poor');
    });

    it('filters out non-complete items', () => {
        const items = [
            makeItem({ status: 'pending', last_worn_at: new Date().toISOString() }),
            makeItem({ status: 'complete', last_worn_at: new Date().toISOString(), purchase_price: 10, wear_count: 10, neglect_status: false }),
        ];
        const result = calculateHealthScore(items);
        // Only 1 complete item, 100% utilized
        expect(result.utilizationFactor).toBe(100);
    });
});

// ─── springCleanService ──────────────────────────────────────────

describe('springCleanService.applySpringCleanResults', () => {
    it('updates resale_status for selling and donating items', async () => {
        await springCleanService.applySpringCleanResults({
            kept: ['a'],
            selling: ['b', 'c'],
            donating: ['d'],
        });

        // Two update calls: one for selling, one for donating
        expect(mockUpdate).toHaveBeenCalledTimes(2);
        expect(mockUpdate).toHaveBeenCalledWith({ resale_status: 'listed' });
        expect(mockUpdate).toHaveBeenCalledWith({ resale_status: 'donated' });
    });

    it('awards 5 points per actioned item', async () => {
        await springCleanService.applySpringCleanResults({
            kept: [],
            selling: ['a', 'b'],
            donating: ['c'],
        });

        expect(gamificationService.addPoints).toHaveBeenCalledWith(15, 'spring_clean');
    });

    it('does not award points if no items actioned', async () => {
        await springCleanService.applySpringCleanResults({
            kept: ['a', 'b'],
            selling: [],
            donating: [],
        });

        expect(gamificationService.addPoints).not.toHaveBeenCalled();
    });
});
