/**
 * Brand Analytics Tests
 * Story 11.1: Cost-Per-Wear Brand Comparison
 */

// ─── Supabase mock ───────────────────────────────────────────────

let mockItemsResult: { data: any[]; error: any } = { data: [], error: null };
let mockWearLogsResult: { data: any[]; error: any } = { data: [], error: null };

const makeChainable = (result: { data: any[]; error: any }) => {
    const q: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue(result),
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
    };
    return q;
};

const mockFrom = jest.fn((table: string) => {
    if (table === 'items') return makeChainable(mockItemsResult);
    if (table === 'wear_logs') return makeChainable(mockWearLogsResult);
    return makeChainable({ data: [], error: null });
});

jest.mock('../../services/supabase', () => ({
    supabase: {
        from: (table: string) => mockFrom(table),
        auth: {
            getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
        },
    },
}));

jest.mock('../../services/auth-helpers', () => ({
    requireUserId: jest.fn().mockResolvedValue('user-1'),
}));

// ─── Imports ─────────────────────────────────────────────────────

import { analyticsService, generateBrandInsight, BrandStats } from '../../services/analyticsService';

// ─── Helpers ─────────────────────────────────────────────────────

function makeItem(overrides: Partial<{
    id: string;
    brand: string;
    category: string;
    purchase_price: number;
    name: string;
    wear_count: number;
}> = {}) {
    return {
        id: overrides.id || 'item-1',
        brand: overrides.brand || 'Nike',
        category: overrides.category || 'shoes',
        purchase_price: overrides.purchase_price ?? 100,
        name: overrides.name || 'Air Max',
        wear_count: overrides.wear_count ?? 10,
        sub_category: null,
        user_id: 'user-1',
    };
}

function repeat<T>(n: number, fn: () => T): T[] {
    return Array.from({ length: n }, fn);
}

function makeWearLog(itemId: string) {
    return { item_id: itemId };
}

// ─── Tests ───────────────────────────────────────────────────────

describe('analyticsService.getBrandAnalytics', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockItemsResult = { data: [], error: null };
        mockWearLogsResult = { data: [], error: null };
    });

    describe('brand grouping', () => {
        it('aggregates items with same brand', async () => {
            // 3 Nike items, 2 Adidas items → only Nike qualifies (3+ threshold)
            mockItemsResult = {
                data: [
                    makeItem({ id: 'n1', brand: 'Nike', purchase_price: 90 }),
                    makeItem({ id: 'n2', brand: 'Nike', purchase_price: 120 }),
                    makeItem({ id: 'n3', brand: 'Nike', purchase_price: 150 }),
                    makeItem({ id: 'a1', brand: 'Adidas', purchase_price: 80 }),
                    makeItem({ id: 'a2', brand: 'Adidas', purchase_price: 60 }),
                ],
                error: null,
            };
            mockWearLogsResult = {
                data: [
                    ...repeat(10, () => makeWearLog('n1')),
                    ...repeat(10, () => makeWearLog('n2')),
                    ...repeat(10, () => makeWearLog('n3')),
                    ...repeat(5, () => makeWearLog('a1')),
                    ...repeat(5, () => makeWearLog('a2')),
                ],
                error: null,
            };

            const { analytics, error } = await analyticsService.getBrandAnalytics();

            expect(error).toBeNull();
            expect(analytics.brands).toHaveLength(1);
            expect(analytics.brands[0].brand).toBe('Nike');
            expect(analytics.brands[0].itemCount).toBe(3);
            expect(analytics.brands[0].totalSpent).toBe(360); // 90+120+150
            expect(analytics.brands[0].totalWears).toBe(30);  // 10+10+10
        });
    });

    describe('CPW calculation', () => {
        it('calculates avgCPW as totalSpent / totalWears', async () => {
            // 3 items, total £120 spent, 40 wears → £3.00/wear
            mockItemsResult = {
                data: [
                    makeItem({ id: 'i1', brand: 'Uniqlo', purchase_price: 40 }),
                    makeItem({ id: 'i2', brand: 'Uniqlo', purchase_price: 40 }),
                    makeItem({ id: 'i3', brand: 'Uniqlo', purchase_price: 40 }),
                ],
                error: null,
            };
            mockWearLogsResult = {
                data: [
                    ...repeat(20, () => makeWearLog('i1')),
                    ...repeat(10, () => makeWearLog('i2')),
                    ...repeat(10, () => makeWearLog('i3')),
                ],
                error: null,
            };

            const { analytics } = await analyticsService.getBrandAnalytics();

            expect(analytics.brands[0].avgCPW).toBeCloseTo(3.0, 2);
        });
    });

    describe('3-item minimum threshold', () => {
        it('excludes brands with fewer than 3 items', async () => {
            mockItemsResult = {
                data: [
                    makeItem({ id: 'z1', brand: 'Zara', purchase_price: 50 }),
                    makeItem({ id: 'z2', brand: 'Zara', purchase_price: 60 }),
                    // Only 2 Zara items → excluded
                    makeItem({ id: 'h1', brand: 'H&M', purchase_price: 30 }),
                    makeItem({ id: 'h2', brand: 'H&M', purchase_price: 30 }),
                    makeItem({ id: 'h3', brand: 'H&M', purchase_price: 30 }),
                ],
                error: null,
            };
            mockWearLogsResult = {
                data: [
                    ...repeat(5, () => makeWearLog('z1')),
                    ...repeat(5, () => makeWearLog('z2')),
                    ...repeat(10, () => makeWearLog('h1')),
                    ...repeat(10, () => makeWearLog('h2')),
                    ...repeat(10, () => makeWearLog('h3')),
                ],
                error: null,
            };

            const { analytics } = await analyticsService.getBrandAnalytics();

            expect(analytics.brands).toHaveLength(1);
            expect(analytics.brands[0].brand).toBe('H&M');
        });

        it('returns empty brands array when no brand meets threshold', async () => {
            mockItemsResult = {
                data: [
                    makeItem({ id: 'x1', brand: 'Brand A', purchase_price: 50 }),
                    makeItem({ id: 'x2', brand: 'Brand A', purchase_price: 60 }),
                    // Only 2 → excluded
                ],
                error: null,
            };
            mockWearLogsResult = { data: [], error: null };

            const { analytics } = await analyticsService.getBrandAnalytics();

            expect(analytics.brands).toHaveLength(0);
            expect(analytics.topBrand).toBeNull();
        });
    });

    describe('category filter', () => {
        it('passes categoryFilter and sets it on analytics result', async () => {
            mockItemsResult = {
                data: [
                    makeItem({ id: 's1', brand: 'Nike', category: 'shoes', purchase_price: 100 }),
                    makeItem({ id: 's2', brand: 'Nike', category: 'shoes', purchase_price: 120 }),
                    makeItem({ id: 's3', brand: 'Nike', category: 'shoes', purchase_price: 80 }),
                ],
                error: null,
            };
            mockWearLogsResult = {
                data: [
                    ...repeat(5, () => makeWearLog('s1')),
                    ...repeat(5, () => makeWearLog('s2')),
                    ...repeat(5, () => makeWearLog('s3')),
                ],
                error: null,
            };

            const { analytics } = await analyticsService.getBrandAnalytics('shoes');

            expect(analytics.categoryFilter).toBe('shoes');
            expect(analytics.brands).toHaveLength(1);
            expect(analytics.brands[0].brand).toBe('Nike');
        });
    });

    describe('sort order', () => {
        it('sorts brands by lowest avgCPW first', async () => {
            // Brand A: £120 / 40 wears = £3.00/wear (best)
            // Brand B: £90 / 10 wears  = £9.00/wear
            // Brand C: £150 / 15 wears = £10.00/wear
            mockItemsResult = {
                data: [
                    makeItem({ id: 'b1', brand: 'Brand B', purchase_price: 30 }),
                    makeItem({ id: 'b2', brand: 'Brand B', purchase_price: 30 }),
                    makeItem({ id: 'b3', brand: 'Brand B', purchase_price: 30 }),
                    makeItem({ id: 'a1', brand: 'Brand A', purchase_price: 40 }),
                    makeItem({ id: 'a2', brand: 'Brand A', purchase_price: 40 }),
                    makeItem({ id: 'a3', brand: 'Brand A', purchase_price: 40 }),
                    makeItem({ id: 'c1', brand: 'Brand C', purchase_price: 50 }),
                    makeItem({ id: 'c2', brand: 'Brand C', purchase_price: 50 }),
                    makeItem({ id: 'c3', brand: 'Brand C', purchase_price: 50 }),
                ],
                error: null,
            };
            mockWearLogsResult = {
                data: [
                    // Brand B: 10 total wears → £90/10 = £9
                    ...repeat(10, () => makeWearLog('b1')),
                    // b2, b3 → 0 wears
                    // Brand A: 40 total wears → £120/40 = £3
                    ...repeat(10, () => makeWearLog('a1')),
                    ...repeat(20, () => makeWearLog('a2')),
                    ...repeat(10, () => makeWearLog('a3')),
                    // Brand C: 15 total wears → £150/15 = £10
                    ...repeat(5, () => makeWearLog('c1')),
                    ...repeat(5, () => makeWearLog('c2')),
                    ...repeat(5, () => makeWearLog('c3')),
                ],
                error: null,
            };

            const { analytics } = await analyticsService.getBrandAnalytics();

            // Brand A: 3.00 first, Brand B: 9.00 second, Brand C: 10.00 third
            expect(analytics.brands[0].brand).toBe('Brand A');
            expect(analytics.brands[0].avgCPW).toBeCloseTo(3.0, 1);
        });
    });

    describe('0 wears edge case', () => {
        it('sets avgCPW to Infinity for brands with 0 total wears and sorts them last', async () => {
            mockItemsResult = {
                data: [
                    makeItem({ id: 'g1', brand: 'Good Brand', purchase_price: 30 }),
                    makeItem({ id: 'g2', brand: 'Good Brand', purchase_price: 30 }),
                    makeItem({ id: 'g3', brand: 'Good Brand', purchase_price: 30 }),
                    makeItem({ id: 'u1', brand: 'Unworn Brand', purchase_price: 100 }),
                    makeItem({ id: 'u2', brand: 'Unworn Brand', purchase_price: 100 }),
                    makeItem({ id: 'u3', brand: 'Unworn Brand', purchase_price: 100 }),
                ],
                error: null,
            };
            // Unworn Brand has no wear logs
            mockWearLogsResult = {
                data: [
                    ...repeat(10, () => makeWearLog('g1')),
                    ...repeat(10, () => makeWearLog('g2')),
                    ...repeat(10, () => makeWearLog('g3')),
                ],
                error: null,
            };

            const { analytics } = await analyticsService.getBrandAnalytics();

            // Good Brand should be first (finite CPW), Unworn Brand last (Infinity)
            expect(analytics.brands[0].brand).toBe('Good Brand');
            expect(analytics.brands[1].brand).toBe('Unworn Brand');
            expect(analytics.brands[1].avgCPW).toBe(Infinity);
        });
    });

    describe('no items at all', () => {
        it('returns empty array and empty state insight when no items', async () => {
            mockItemsResult = { data: [], error: null };
            mockWearLogsResult = { data: [], error: null };

            const { analytics, error } = await analyticsService.getBrandAnalytics();

            expect(error).toBeNull();
            expect(analytics.brands).toHaveLength(0);
            expect(analytics.topBrand).toBeNull();
            expect(analytics.insight).toContain('Add brands');
        });
    });

    describe('best item tracking', () => {
        it('identifies the lowest CPW item per brand', async () => {
            // i1: £30 / 30 wears = £1.00/wear (best)
            // i2: £60 / 10 wears = £6.00/wear
            // i3: £90 /  5 wears = £18.00/wear
            mockItemsResult = {
                data: [
                    makeItem({ id: 'i1', brand: 'Nike', name: 'Budget Tee', purchase_price: 30 }),
                    makeItem({ id: 'i2', brand: 'Nike', name: 'Mid Tee', purchase_price: 60 }),
                    makeItem({ id: 'i3', brand: 'Nike', name: 'Premium Tee', purchase_price: 90 }),
                ],
                error: null,
            };
            mockWearLogsResult = {
                data: [
                    ...repeat(30, () => makeWearLog('i1')),
                    ...repeat(10, () => makeWearLog('i2')),
                    ...repeat(5, () => makeWearLog('i3')),
                ],
                error: null,
            };

            const { analytics } = await analyticsService.getBrandAnalytics();

            expect(analytics.brands[0].bestItem).toBe('Budget Tee');
            expect(analytics.brands[0].bestItemCPW).toBeCloseTo(1.0, 2);
        });
    });

    describe('topBrand', () => {
        it('sets topBrand to the brand with lowest avgCPW', async () => {
            mockItemsResult = {
                data: [
                    makeItem({ id: 'i1', brand: 'Uniqlo', purchase_price: 20 }),
                    makeItem({ id: 'i2', brand: 'Uniqlo', purchase_price: 20 }),
                    makeItem({ id: 'i3', brand: 'Uniqlo', purchase_price: 20 }),
                    makeItem({ id: 'i4', brand: 'Gucci', purchase_price: 500 }),
                    makeItem({ id: 'i5', brand: 'Gucci', purchase_price: 500 }),
                    makeItem({ id: 'i6', brand: 'Gucci', purchase_price: 500 }),
                ],
                error: null,
            };
            mockWearLogsResult = {
                data: [
                    ...repeat(30, () => makeWearLog('i1')),
                    ...repeat(30, () => makeWearLog('i2')),
                    ...repeat(30, () => makeWearLog('i3')),
                    ...repeat(2, () => makeWearLog('i4')),
                    ...repeat(2, () => makeWearLog('i5')),
                    ...repeat(2, () => makeWearLog('i6')),
                ],
                error: null,
            };

            const { analytics } = await analyticsService.getBrandAnalytics();

            expect(analytics.topBrand).not.toBeNull();
            expect(analytics.topBrand!.brand).toBe('Uniqlo');
        });
    });
});

// ─── generateBrandInsight tests ────────────────────────────────

describe('generateBrandInsight', () => {
    it('returns empty state message when brands array is empty', () => {
        const insight = generateBrandInsight([]);
        expect(insight).toContain('Add brands');
    });

    it('includes brand name and CPW in insight text', () => {
        const brands: BrandStats[] = [{
            brand: 'Everlane',
            itemCount: 3,
            totalSpent: 120,
            totalWears: 100,
            avgCPW: 1.2,
        }];
        const insight = generateBrandInsight(brands);
        expect(insight).toContain('Everlane');
        expect(insight).toContain('1.20');
    });

    it('returns add-prices prompt when top brand has Infinity CPW', () => {
        const brands: BrandStats[] = [{
            brand: 'Nike',
            itemCount: 3,
            totalSpent: 0,
            totalWears: 0,
            avgCPW: Infinity,
        }];
        const insight = generateBrandInsight(brands);
        expect(insight).toContain('Add purchase prices');
    });

    it('mentions best item when bestItem exists and CPW differs from avgCPW', () => {
        const brands: BrandStats[] = [{
            brand: 'Uniqlo',
            itemCount: 3,
            totalSpent: 90,
            totalWears: 45,
            avgCPW: 2.0,
            bestItem: 'Merino Wool Jumper',
            bestItemCPW: 0.5,
        }];
        const insight = generateBrandInsight(brands);
        expect(insight).toContain('Merino Wool Jumper');
        expect(insight).toContain('0.50');
    });
});
