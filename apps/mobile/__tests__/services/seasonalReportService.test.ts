/**
 * Seasonal Report Service Tests
 * Story 11.4: Seasonal Wardrobe Reports
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

// ─── Supabase mock ───────────────────────────────────────────────

const mockFrom = jest.fn();

jest.mock('../../services/supabase', () => ({
    supabase: { from: (table: string) => mockFrom(table) },
}));

// ─── auth-helpers mock ───────────────────────────────────────────

jest.mock('../../services/auth-helpers', () => ({
    requireUserId: jest.fn().mockResolvedValue('user-1'),
}));

// ─── Import after mocks ───────────────────────────────────────────

import {
    getSeasonForMonth,
    getCurrentSeason,
    getSeasonDateRange,
    getTransitionAlert,
    calculateReadinessScore,
    generateRecommendations,
    seasonalReportService,
} from '../../services/seasonalReportService';
import { Season } from '../../types/seasonalReport';

// ─── Helpers ─────────────────────────────────────────────────────

function makeItem(overrides: Partial<{
    id: string;
    category: string;
    seasons: string[];
    name: string;
}> = {}) {
    return {
        id: overrides.id || 'item-1',
        user_id: 'user-1',
        image_url: '',
        category: overrides.category || 'tops',
        seasons: overrides.seasons || [],
        name: overrides.name || undefined,
        sub_category: undefined,
        colors: [],
        occasions: [],
        wear_count: 0,
        is_favorite: false,
        status: 'complete' as const,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
    };
}

function repeat<T>(n: number, fn: (i: number) => T): T[] {
    return Array.from({ length: n }, (_, i) => fn(i));
}

// ─── getSeasonForMonth ────────────────────────────────────────────

describe('getSeasonForMonth', () => {
    it('returns spring for March', () => expect(getSeasonForMonth(3)).toBe('spring'));
    it('returns spring for May', () => expect(getSeasonForMonth(5)).toBe('spring'));
    it('returns summer for June', () => expect(getSeasonForMonth(6)).toBe('summer'));
    it('returns summer for August', () => expect(getSeasonForMonth(8)).toBe('summer'));
    it('returns fall for September', () => expect(getSeasonForMonth(9)).toBe('fall'));
    it('returns fall for November', () => expect(getSeasonForMonth(11)).toBe('fall'));
    it('returns winter for December', () => expect(getSeasonForMonth(12)).toBe('winter'));
    it('returns winter for January', () => expect(getSeasonForMonth(1)).toBe('winter'));
    it('returns winter for February', () => expect(getSeasonForMonth(2)).toBe('winter'));
    it('returns summer for July', () => expect(getSeasonForMonth(7)).toBe('summer'));
    it('returns fall for October', () => expect(getSeasonForMonth(10)).toBe('fall'));
    it('returns spring for April', () => expect(getSeasonForMonth(4)).toBe('spring'));
});

// ─── getCurrentSeason ─────────────────────────────────────────────

describe('getCurrentSeason', () => {
    it('returns the correct season for a mocked date', () => {
        const spy = jest.spyOn(global, 'Date').mockImplementation((...args: any[]) => {
            if (args.length === 0) return { getMonth: () => 6 } as any; // July → summer
            return new (jest.requireActual('Date'))(...args) as any;
        });
        expect(getCurrentSeason()).toBe('summer');
        spy.mockRestore();
    });
});

// ─── getSeasonDateRange ───────────────────────────────────────────

describe('getSeasonDateRange', () => {
    it('returns correct range for spring 2025', () => {
        const { startStr, endStr } = getSeasonDateRange('spring', 2025);
        expect(startStr).toBe('2025-03-01');
        expect(endStr).toBe('2025-05-31');
    });

    it('returns correct range for summer 2025', () => {
        const { startStr, endStr } = getSeasonDateRange('summer', 2025);
        expect(startStr).toBe('2025-06-01');
        expect(endStr).toBe('2025-08-31');
    });

    it('returns correct range for fall 2025', () => {
        const { startStr, endStr } = getSeasonDateRange('fall', 2025);
        expect(startStr).toBe('2025-09-01');
        expect(endStr).toBe('2025-11-30');
    });

    it('returns correct range for winter 2025 (Dec 2025 – Feb 2026)', () => {
        const { startStr, endStr } = getSeasonDateRange('winter', 2025);
        expect(startStr).toBe('2025-12-01');
        expect(endStr).toBe('2026-02-28'); // 2026 is not a leap year
    });

    it('returns Feb 29 for winter ending in leap year', () => {
        // Winter 2023 → ends Feb 2024 (2024 is a leap year)
        const { endStr } = getSeasonDateRange('winter', 2023);
        expect(endStr).toBe('2024-02-29');
    });
});

// ─── getTransitionAlert ───────────────────────────────────────────

describe('getTransitionAlert', () => {
    it('returns alert when spring starts in 12 days (Feb 17)', () => {
        const feb17 = new Date(2025, 1, 17); // Feb 17 2025 → 12 days to Mar 1
        const alert = getTransitionAlert(feb17);
        expect(alert).toBeDefined();
        expect(alert).toContain('Spring');
        expect(alert).toContain('12 day');
    });

    it('returns alert when winter starts in 7 days (Nov 24)', () => {
        const nov24 = new Date(2025, 10, 24); // Nov 24 → 7 days to Dec 1
        const alert = getTransitionAlert(nov24);
        expect(alert).toBeDefined();
        expect(alert).toContain('Winter');
        expect(alert).toContain('7 day');
    });

    it('returns undefined when more than 14 days from next season', () => {
        const jan15 = new Date(2025, 0, 15); // Jan 15 → 44 days to Mar 1
        const alert = getTransitionAlert(jan15);
        expect(alert).toBeUndefined();
    });

    it('returns alert for exactly 14 days away', () => {
        const feb15 = new Date(2025, 1, 15); // Feb 15 → 14 days to Mar 1
        const alert = getTransitionAlert(feb15);
        expect(alert).toBeDefined();
        expect(alert).toContain('14 day');
    });

    it('returns undefined when exactly on season start (0 days away would be past)', () => {
        // Mar 1 is today — the next spring start is next year (366+ days)
        const mar1 = new Date(2025, 2, 1);
        const alert = getTransitionAlert(mar1);
        // Mar 1 itself is the start, so daysUntil > 14 for all other seasons
        // (next spring is 365 days away, next other seasons are > 14 days away)
        expect(alert).toBeUndefined();
    });

    it('uses singular "day" when 1 day away', () => {
        const aug31 = new Date(2025, 7, 31); // Aug 31 → 1 day to Sep 1 (fall)
        const alert = getTransitionAlert(aug31);
        expect(alert).toBeDefined();
        expect(alert).toContain('1 day');
        expect(alert).not.toContain('1 days');
    });
});

// ─── calculateReadinessScore ──────────────────────────────────────

describe('calculateReadinessScore', () => {
    it('returns 0 for empty wardrobe', () => {
        expect(calculateReadinessScore([], {})).toBe(0);
    });

    it('returns 10 for perfect wardrobe: all categories, 10+ items, 80% worn', () => {
        const items = [
            ...repeat(3, i => makeItem({ id: `top-${i}`, category: 'tops' })),
            ...repeat(3, i => makeItem({ id: `bot-${i}`, category: 'bottoms' })),
            ...repeat(2, i => makeItem({ id: `out-${i}`, category: 'outerwear' })),
            ...repeat(2, i => makeItem({ id: `shoe-${i}`, category: 'shoes' })),
        ]; // 10 items, all 4 key categories
        const wearCounts: Record<string, number> = {};
        // 9 out of 10 items worn = 90% > 75%
        items.slice(0, 9).forEach(i => { wearCounts[i.id] = 3; });
        expect(calculateReadinessScore(items, wearCounts)).toBe(10);
    });

    it('scores category coverage correctly (4 pts max)', () => {
        // Only tops — 0 coverage pts for others; variety=1 (2 items); usage=0 (none worn)
        const items = repeat(2, i => makeItem({ id: `t-${i}`, category: 'tops' }));
        const score = calculateReadinessScore(items, {});
        // coverage=1, variety=1, usage=0 → 2
        expect(score).toBe(2);
    });

    it('scores variety: 5 items = 2pts', () => {
        const items = [
            ...repeat(2, i => makeItem({ id: `top-${i}`, category: 'tops' })),
            ...repeat(1, i => makeItem({ id: `bot-${i}`, category: 'bottoms' })),
            ...repeat(1, i => makeItem({ id: `out-${i}`, category: 'outerwear' })),
            ...repeat(1, i => makeItem({ id: `shoe-${i}`, category: 'shoes' })),
        ]; // 5 items, all 4 categories
        // coverage=4, variety=2 (5-9 items), usage=0
        expect(calculateReadinessScore(items, {})).toBe(6);
    });

    it('scores active usage: >75% worn = 3pts', () => {
        const items = repeat(4, i => makeItem({ id: `t-${i}`, category: 'tops' }));
        const wearCounts: Record<string, number> = {
            't-0': 1, 't-1': 2, 't-2': 3, // 3 of 4 worn = 75% (>75% needs > not >=)
        };
        const score = calculateReadinessScore(items, wearCounts);
        // 75% is not >75% so usagePts = 2; coverage=1, variety=1
        expect(score).toBe(4);
    });

    it('scores active usage: >75% worn = 3pts when strictly over', () => {
        const items = repeat(4, i => makeItem({ id: `t-${i}`, category: 'tops' }));
        const wearCounts: Record<string, number> = {
            't-0': 1, 't-1': 2, 't-2': 3, 't-3': 1, // 4 of 4 = 100%
        };
        const score = calculateReadinessScore(items, wearCounts);
        // coverage=1, variety=1, usage=3
        expect(score).toBe(5);
    });
});

// ─── generateRecommendations ──────────────────────────────────────

describe('generateRecommendations', () => {
    it('returns tagging prompt for empty wardrobe', () => {
        const recs = generateRecommendations([], {}, 0, 'fall');
        expect(recs.length).toBe(1);
        expect(recs[0]).toContain('fall');
    });

    it('suggests adding missing outerwear', () => {
        const items = [makeItem({ category: 'tops' })];
        const recs = generateRecommendations(items, {}, 0, 'fall');
        const outerwearRec = recs.find(r => r.includes('outerwear'));
        expect(outerwearRec).toBeDefined();
    });

    it('suggests expanding wardrobe when fewer than 5 items', () => {
        const items = repeat(3, i => makeItem({ id: `t-${i}`, category: 'tops' }));
        const recs = generateRecommendations(items, {}, 0, 'summer');
        const varietyRec = recs.find(r => r.includes('3 summer'));
        expect(varietyRec).toBeDefined();
    });

    it('mentions neglected items when count is 1-5', () => {
        const items = repeat(8, i => makeItem({ id: `t-${i}`, category: 'tops' }));
        const wearCounts = { 't-0': 1, 't-1': 1, 't-2': 1 }; // 3 of 8 worn, 5 neglected
        const recs = generateRecommendations(items, wearCounts, 5, 'winter');
        const neglectedRec = recs.find(r => r.includes('5 unworn'));
        expect(neglectedRec).toBeDefined();
    });

    it('gives wardrobe review recommendation for >5 neglected', () => {
        const items = repeat(10, i => makeItem({ id: `t-${i}`, category: 'tops' }));
        const recs = generateRecommendations(items, {}, 8, 'spring');
        const reviewRec = recs.find(r => r.includes('wardrobe review'));
        expect(reviewRec).toBeDefined();
    });

    it('praises good usage when 90%+ worn', () => {
        const items = repeat(10, i => makeItem({ id: `t-${i}`, category: 'tops' }));
        const wearCounts: Record<string, number> = {};
        items.forEach(i => { wearCounts[i.id] = 2; }); // 100% worn
        const recs = generateRecommendations(items, wearCounts, 0, 'summer');
        const praiseRec = recs.find(r => r.includes('Great job'));
        expect(praiseRec).toBeDefined();
    });

    it('returns at most 3 recommendations', () => {
        // Wardrobe with missing categories + few items + no wears
        const items = [makeItem({ category: 'tops' })];
        const recs = generateRecommendations(items, {}, 0, 'fall');
        expect(recs.length).toBeLessThanOrEqual(3);
    });
});

// ─── seasonalReportService (integration) ─────────────────────────

describe('seasonalReportService.getSeasonalReport', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    });

    function setupSupabaseMock(items: any[], logs: any[]) {
        mockFrom.mockImplementation((table: string) => {
            if (table === 'items') {
                return {
                    select: () => ({
                        eq: () => ({
                            contains: () => Promise.resolve({ data: items, error: null }),
                        }),
                    }),
                };
            }
            if (table === 'wear_logs') {
                return {
                    select: () => ({
                        eq: () => ({
                            gte: () => ({
                                lte: () => Promise.resolve({ data: logs, error: null }),
                            }),
                        }),
                    }),
                };
            }
            return { select: () => ({ eq: () => ({ contains: () => Promise.resolve({ data: [], error: null }) }) }) };
        });
    }

    it('returns empty report gracefully when no items', async () => {
        setupSupabaseMock([], []);
        const { result, error } = await seasonalReportService.getSeasonalReport('spring', 2025);
        expect(error).toBeNull();
        expect(result.currentReport.totalItemsForSeason).toBe(0);
        expect(result.currentReport.readinessScore).toBe(0);
    });

    it('returns currentSeason and currentYear', async () => {
        setupSupabaseMock([], []);
        const { result } = await seasonalReportService.getSeasonalReport('summer', 2025);
        expect(result.currentSeason).toBe('summer');
        expect(result.currentYear).toBe(2025);
    });

    it('computes totalWears from wear logs', async () => {
        const items = [makeItem({ id: 'i1', category: 'tops' })];
        const logs = [
            { item_id: 'i1', worn_date: '2025-06-10' },
            { item_id: 'i1', worn_date: '2025-07-01' },
        ];
        setupSupabaseMock(items, logs);
        const { result } = await seasonalReportService.getSeasonalReport('summer', 2025);
        expect(result.currentReport.totalWears).toBe(2);
    });

    it('identifies most worn items (top 5, worn > 0)', async () => {
        const items = repeat(6, i => makeItem({ id: `i${i}`, category: 'tops' }));
        const logs = [
            { item_id: 'i0', worn_date: '2025-03-01' },
            { item_id: 'i0', worn_date: '2025-03-02' },
            { item_id: 'i0', worn_date: '2025-03-03' }, // 3x
            { item_id: 'i1', worn_date: '2025-03-01' }, // 1x
            { item_id: 'i2', worn_date: '2025-03-01' }, // 1x
            { item_id: 'i3', worn_date: '2025-03-01' }, // 1x
            { item_id: 'i4', worn_date: '2025-03-01' }, // 1x
            { item_id: 'i5', worn_date: '2025-03-01' }, // 1x
        ];
        setupSupabaseMock(items, logs);
        const { result } = await seasonalReportService.getSeasonalReport('spring', 2025);
        // i5 is 6th most worn — should be capped at 5
        expect(result.currentReport.mostWornItems.length).toBe(5);
        expect(result.currentReport.mostWornItems[0].itemId).toBe('i0');
        expect(result.currentReport.mostWornItems[0].wearCount).toBe(3);
    });

    it('identifies neglected items (0 wears in season)', async () => {
        const items = [
            makeItem({ id: 'worn', category: 'tops' }),
            makeItem({ id: 'neglected', category: 'tops' }),
        ];
        const logs = [{ item_id: 'worn', worn_date: '2025-09-10' }];
        setupSupabaseMock(items, logs);
        const { result } = await seasonalReportService.getSeasonalReport('fall', 2025);
        const neglected = result.currentReport.neglectedItems;
        expect(neglected.some(i => i.itemId === 'neglected')).toBe(true);
        expect(neglected.some(i => i.itemId === 'worn')).toBe(false);
    });

    it('sets comparisonText to first-tracked message when no previous year cache', async () => {
        setupSupabaseMock([], []);
        const { result } = await seasonalReportService.getSeasonalReport('fall', 2025);
        expect(result.comparisonText).toBeDefined();
        expect(result.comparisonText).toContain('First fall');
    });

    it('uses cached previous year data for comparison', async () => {
        const prevReport = {
            season: 'fall' as Season,
            year: 2024,
            totalItemsForSeason: 5,
            itemsByCategory: {},
            mostWornItems: [],
            neglectedItems: [],
            totalWears: 10,
            readinessScore: 5,
            recommendations: [],
        };
        mockStorage['seasonal_report_user-1_fall_2024'] = JSON.stringify(prevReport);

        const items = repeat(5, i => makeItem({ id: `i${i}`, category: 'tops' }));
        const logs = repeat(12, i => ({ item_id: 'i0', worn_date: `2025-09-${String(i + 1).padStart(2, '0')}` }));
        setupSupabaseMock(items, logs);

        const { result } = await seasonalReportService.getSeasonalReport('fall', 2025);
        expect(result.comparisonText).toBeDefined();
        expect(result.comparisonText).toContain('%'); // percentage delta
    });

    it('returns error gracefully on failure', async () => {
        mockFrom.mockImplementation(() => { throw new Error('Network error'); });
        const { result, error } = await seasonalReportService.getSeasonalReport('spring', 2025);
        expect(error).not.toBeNull();
        expect(error!.message).toBe('Network error');
        expect(result.currentReport.totalItemsForSeason).toBe(0);
    });
});

// ─── comparison text ─────────────────────────────────────────────
// Tested indirectly via seasonalReportService but here we verify delta math

describe('historical comparison math', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    });

    function setupSupabaseMock(items: any[], logs: any[]) {
        mockFrom.mockImplementation((table: string) => {
            if (table === 'items') {
                return {
                    select: () => ({
                        eq: () => ({
                            contains: () => Promise.resolve({ data: items, error: null }),
                        }),
                    }),
                };
            }
            if (table === 'wear_logs') {
                return {
                    select: () => ({
                        eq: () => ({
                            gte: () => ({
                                lte: () => Promise.resolve({ data: logs, error: null }),
                            }),
                        }),
                    }),
                };
            }
            return { select: () => ({ eq: () => ({ contains: () => Promise.resolve({ data: [], error: null }) }) }) };
        });
    }

    it('shows 33% more wears: 20 this year vs 15 last year', async () => {
        const prevReport = {
            season: 'summer' as Season,
            year: 2024,
            totalItemsForSeason: 5,
            itemsByCategory: {},
            mostWornItems: [],
            neglectedItems: [],
            totalWears: 15,
            readinessScore: 5,
            recommendations: [],
        };
        mockStorage['seasonal_report_user-1_summer_2024'] = JSON.stringify(prevReport);

        const items = repeat(5, i => makeItem({ id: `i${i}`, category: 'tops' }));
        const logs = repeat(20, i => ({ item_id: 'i0', worn_date: `2025-06-${String((i % 28) + 1).padStart(2, '0')}` }));
        setupSupabaseMock(items, logs);

        const { result } = await seasonalReportService.getSeasonalReport('summer', 2025);
        expect(result.comparisonText).toContain('33%');
        expect(result.comparisonText).toContain('▲');
    });
});
