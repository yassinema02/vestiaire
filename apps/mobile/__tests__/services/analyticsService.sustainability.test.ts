/**
 * Sustainability Score Tests
 * Story 11.2: Sustainability Score & Environmental Savings
 * Tests 5-factor model, CO2 savings, badge, tips, tiers
 */

// ─── Supabase mock ───────────────────────────────────────────────

let mockItemsResult: { data: any[]; error: any } = { data: [], error: null };
let mockWearLogsResult: { data: any[]; error: any } = { data: [], error: null };
let mockResaleResult: { data: any[]; error: any } = { data: [], error: null };
let mockStatsResult: { data: any; error: any } = { data: null, error: { code: 'PGRST116' } };

const makeChainable = (getResult: () => { data: any; error: any }) => {
    const q: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        in: jest.fn(() => makeChainable(getResult)),
        gte: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve(getResult())),
        update: jest.fn().mockReturnThis(),
        then: (resolve: any, reject: any) => Promise.resolve(getResult()).then(resolve, reject),
    };
    return q;
};

const mockFrom = jest.fn((table: string) => {
    if (table === 'wear_logs') return makeChainable(() => mockWearLogsResult);
    if (table === 'user_stats') {
        // Return chainable that when .select.eq.single resolves with statsResult
        const q: any = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            single: jest.fn(() => Promise.resolve(mockStatsResult)),
            then: (resolve: any, reject: any) => Promise.resolve(mockStatsResult).then(resolve, reject),
        };
        return q;
    }
    // items table — need to handle both complete items and resale items
    // We differentiate by checking if .in() is called (resale query uses .in())
    const q: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        in: jest.fn(() => ({
            then: (resolve: any, reject: any) => Promise.resolve(mockResaleResult).then(resolve, reject),
        })),
        then: (resolve: any, reject: any) => Promise.resolve(mockItemsResult).then(resolve, reject),
    };
    return q;
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

// ─── Import AFTER mocks ───────────────────────────────────────────

import { analyticsService } from '../../services/analyticsService';

// ─── Helpers ─────────────────────────────────────────────────────

const NINETY_DAYS_AGO = new Date();
NINETY_DAYS_AGO.setDate(NINETY_DAYS_AGO.getDate() - 91);
const OLD_DATE = NINETY_DAYS_AGO.toISOString();

const RECENT_DATE = new Date().toISOString();

function makeItem(id: string, wearCount: number, price: number | null = null, createdAt: string = OLD_DATE) {
    return {
        id,
        wear_count: wearCount,
        purchase_price: price,
        created_at: createdAt,
    };
}

// ─── Tests ───────────────────────────────────────────────────────

describe('analyticsService.getSustainabilityScore', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockItemsResult = { data: [], error: null };
        mockWearLogsResult = { data: [], error: null };
        mockResaleResult = { data: [], error: null };
        // No cache — force recalculation
        mockStatsResult = { data: null, error: { code: 'PGRST116' } };
    });

    describe('empty wardrobe', () => {
        it('returns score 0 when no items', async () => {
            mockItemsResult = { data: [], error: null };

            const { score } = await analyticsService.getSustainabilityScore();

            expect(score.score).toBe(0);
            expect(score.badgeUnlocked).toBe(false);
        });
    });

    describe('5-factor weighted score', () => {
        it('calculates correct weighted score from known inputs', async () => {
            // 4 items, all old (not new), all worn 30 times (max wear depth), all active
            mockItemsResult = {
                data: [
                    makeItem('i1', 30, 30),
                    makeItem('i2', 30, 30),
                    makeItem('i3', 30, 30),
                    makeItem('i4', 30, 30),
                ],
                error: null,
            };
            // All 4 active in last 90 days
            mockWearLogsResult = {
                data: [
                    { item_id: 'i1' },
                    { item_id: 'i2' },
                    { item_id: 'i3' },
                    { item_id: 'i4' },
                ],
                error: null,
            };
            // No resale items
            mockResaleResult = { data: [], error: null };

            const { score } = await analyticsService.getSustainabilityScore();

            // WearDepth: 30/30=100% (30%), Utilization: 4/4=100% (25%), ValueEff: CPW=1.0→100% (20%)
            // Resale: 0% (15%), PurchaseRestraint: no new items=100% (10%)
            // = 100*0.30 + 100*0.25 + 100*0.20 + 0*0.15 + 100*0.10 = 30+25+20+0+10 = 85
            expect(score.score).toBe(85);
        });
    });

    describe('CO2 savings', () => {
        it('calculates CO2 as (totalWears - totalItems) * 0.5', async () => {
            // 10 items, each worn 5 times = 50 total wears
            // CO2 = (50 - 10) * 0.5 = 20 kg
            mockItemsResult = {
                data: Array.from({ length: 10 }, (_, i) => makeItem(`i${i}`, 5)),
                error: null,
            };
            mockWearLogsResult = { data: [], error: null };
            mockResaleResult = { data: [], error: null };

            const { score } = await analyticsService.getSustainabilityScore();

            expect(score.co2Saved).toBe(20);
        });

        it('returns 0 CO2 when items have never been worn', async () => {
            // 3 items, each worn 0 times — totalWears(0) - totalItems(3) = negative → 0
            mockItemsResult = {
                data: [makeItem('i1', 0), makeItem('i2', 0), makeItem('i3', 0)],
                error: null,
            };
            mockWearLogsResult = { data: [], error: null };
            mockResaleResult = { data: [], error: null };

            const { score } = await analyticsService.getSustainabilityScore();

            expect(score.co2Saved).toBe(0);
        });
    });

    describe('resale activity factor', () => {
        it('scores resale activity based on listed/sold items', async () => {
            // 10 items total, 3 with resale status
            mockItemsResult = {
                data: Array.from({ length: 10 }, (_, i) => makeItem(`i${i}`, 5)),
                error: null,
            };
            mockWearLogsResult = { data: [], error: null };
            // 3 listed/sold → 3/10 = 30%
            mockResaleResult = {
                data: [{ id: 'i0' }, { id: 'i1' }, { id: 'i2' }],
                error: null,
            };

            const { score } = await analyticsService.getSustainabilityScore();

            expect(score.resaleActivity).toBe(30);
        });
    });

    describe('purchase restraint factor', () => {
        it('scores 100 when no new items in 90 days', async () => {
            mockItemsResult = {
                data: [makeItem('i1', 5, null, OLD_DATE), makeItem('i2', 5, null, OLD_DATE)],
                error: null,
            };
            mockWearLogsResult = { data: [], error: null };
            mockResaleResult = { data: [], error: null };

            const { score } = await analyticsService.getSustainabilityScore();

            expect(score.purchaseRestraint).toBe(100);
        });

        it('scores 40 when 3 new items purchased in last 90 days', async () => {
            // 3 new items → (1 - 3/5) * 100 = 40%
            mockItemsResult = {
                data: [
                    makeItem('i1', 5, null, RECENT_DATE),
                    makeItem('i2', 5, null, RECENT_DATE),
                    makeItem('i3', 5, null, RECENT_DATE),
                    makeItem('i4', 5, null, OLD_DATE),
                ],
                error: null,
            };
            mockWearLogsResult = { data: [], error: null };
            mockResaleResult = { data: [], error: null };

            const { score } = await analyticsService.getSustainabilityScore();

            expect(score.purchaseRestraint).toBe(40);
        });

        it('scores 0 when 5+ new items purchased', async () => {
            mockItemsResult = {
                data: Array.from({ length: 5 }, (_, i) => makeItem(`i${i}`, 1, null, RECENT_DATE)),
                error: null,
            };
            mockWearLogsResult = { data: [], error: null };
            mockResaleResult = { data: [], error: null };

            const { score } = await analyticsService.getSustainabilityScore();

            expect(score.purchaseRestraint).toBe(0);
        });
    });

    describe('tier assignment', () => {
        it('assigns "Top 5%" tier when score > 85', async () => {
            // Max everything: high wear, all active, good CPW, resale, no new items
            mockItemsResult = {
                data: Array.from({ length: 5 }, (_, i) => makeItem(`i${i}`, 30, 30, OLD_DATE)),
                error: null,
            };
            mockWearLogsResult = {
                data: Array.from({ length: 5 }, (_, i) => ({ item_id: `i${i}` })),
                error: null,
            };
            // 2 resale items → 2/5 = 40%
            mockResaleResult = { data: [{ id: 'i0' }, { id: 'i1' }], error: null };

            const { score } = await analyticsService.getSustainabilityScore();

            // WD=100(30%), U=100(25%), VE=100(20%), RA=40(15%), PR=100(10%)
            // = 30+25+20+6+10 = 91
            expect(score.score).toBeGreaterThan(85);
            expect(score.tier).toContain('Top 5%');
        });

        it('assigns "Getting started" tier when score ≤ 40', async () => {
            // All zeros basically — 0 wears, 0 active, no prices
            mockItemsResult = {
                data: [makeItem('i1', 0), makeItem('i2', 0)],
                error: null,
            };
            mockWearLogsResult = { data: [], error: null };
            mockResaleResult = { data: [], error: null };

            const { score } = await analyticsService.getSustainabilityScore();

            expect(score.tier).toContain('Getting started');
        });
    });

    describe('badge unlock', () => {
        it('unlocks Eco Warrior badge when score >= 80', async () => {
            // Build a scenario that scores >= 80
            // WD=100(30%), U=100(25%), VE=100(20%), RA=0(15%), PR=100(10%) = 85
            mockItemsResult = {
                data: Array.from({ length: 4 }, (_, i) => makeItem(`i${i}`, 30, 30, OLD_DATE)),
                error: null,
            };
            mockWearLogsResult = {
                data: Array.from({ length: 4 }, (_, i) => ({ item_id: `i${i}` })),
                error: null,
            };
            mockResaleResult = { data: [], error: null };

            const { score } = await analyticsService.getSustainabilityScore();

            expect(score.badgeUnlocked).toBe(true);
            expect(score.badgeName).toBe('Eco Warrior 🌱');
        });

        it('does not unlock badge when score < 80', async () => {
            mockItemsResult = {
                data: [makeItem('i1', 0), makeItem('i2', 0), makeItem('i3', 0)],
                error: null,
            };
            mockWearLogsResult = { data: [], error: null };
            mockResaleResult = { data: [], error: null };

            const { score } = await analyticsService.getSustainabilityScore();

            expect(score.badgeUnlocked).toBe(false);
            expect(score.badgeName).toBeUndefined();
        });
    });

    describe('tip generation', () => {
        it('recommends resale when resale activity is lowest factor', async () => {
            // Make resale the clear weakest factor (0%), others reasonable
            mockItemsResult = {
                data: Array.from({ length: 4 }, (_, i) => makeItem(`i${i}`, 20, 20, OLD_DATE)),
                error: null,
            };
            mockWearLogsResult = {
                // Only 2/4 active → utilization 50%
                data: [{ item_id: 'i0' }, { item_id: 'i1' }],
                error: null,
            };
            // No resale items → resale 0%
            mockResaleResult = { data: [], error: null };

            const { score } = await analyticsService.getSustainabilityScore();

            // resaleActivity = 0% is the clear weakest
            expect(score.tip).toContain('resale');
        });
    });
});
