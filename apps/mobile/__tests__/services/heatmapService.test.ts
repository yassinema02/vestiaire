/**
 * Heatmap Service Tests
 * Story 11.5: Wear Frequency Heatmap
 */

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
    getIntensity,
    getDateRange,
    navigateDate,
    getPeriodLabel,
    calculateStreaks,
    getHeatmapData,
} from '../../services/heatmapService';
import { HeatmapDay } from '../../types/heatmap';

// ─── getIntensity ─────────────────────────────────────────────────

describe('getIntensity', () => {
    it('returns 0 for 0 wears', () => expect(getIntensity(0)).toBe(0));
    it('returns 1 for 1 wear', () => expect(getIntensity(1)).toBe(1));
    it('returns 2 for 2 wears', () => expect(getIntensity(2)).toBe(2));
    it('returns 2 for 3 wears', () => expect(getIntensity(3)).toBe(2));
    it('returns 3 for 4 wears', () => expect(getIntensity(4)).toBe(3));
    it('returns 3 for 5 wears', () => expect(getIntensity(5)).toBe(3));
    it('returns 4 for 6 wears', () => expect(getIntensity(6)).toBe(4));
    it('returns 4 for 100 wears', () => expect(getIntensity(100)).toBe(4));
});

// ─── getDateRange ─────────────────────────────────────────────────

describe('getDateRange', () => {
    describe('month view', () => {
        it('returns full Feb 2026 (28 days)', () => {
            const ref = new Date(2026, 1, 10); // Feb 10 2026
            const { startStr, endStr } = getDateRange('month', ref);
            expect(startStr).toBe('2026-02-01');
            expect(endStr).toBe('2026-02-28');
        });

        it('returns full Jan 2026 (31 days)', () => {
            const { startStr, endStr } = getDateRange('month', new Date(2026, 0, 15));
            expect(startStr).toBe('2026-01-01');
            expect(endStr).toBe('2026-01-31');
        });

        it('returns full Feb 2024 (leap year, 29 days)', () => {
            const { startStr, endStr } = getDateRange('month', new Date(2024, 1, 5));
            expect(startStr).toBe('2024-02-01');
            expect(endStr).toBe('2024-02-29');
        });
    });

    describe('quarter view', () => {
        it('returns Q1 (Jan-Mar) for January reference', () => {
            const { startStr, endStr } = getDateRange('quarter', new Date(2026, 0, 15));
            expect(startStr).toBe('2026-01-01');
            expect(endStr).toBe('2026-03-31');
        });

        it('returns Q2 (Apr-Jun) for May reference', () => {
            const { startStr, endStr } = getDateRange('quarter', new Date(2026, 4, 10));
            expect(startStr).toBe('2026-04-01');
            expect(endStr).toBe('2026-06-30');
        });

        it('returns Q3 (Jul-Sep) for August reference', () => {
            const { startStr, endStr } = getDateRange('quarter', new Date(2026, 7, 1));
            expect(startStr).toBe('2026-07-01');
            expect(endStr).toBe('2026-09-30');
        });

        it('returns Q4 (Oct-Dec) for November reference', () => {
            const { startStr, endStr } = getDateRange('quarter', new Date(2026, 10, 20));
            expect(startStr).toBe('2026-10-01');
            expect(endStr).toBe('2026-12-31');
        });
    });

    describe('year view', () => {
        it('returns full 2026 (Jan 1 – Dec 31)', () => {
            const { startStr, endStr } = getDateRange('year', new Date(2026, 5, 15));
            expect(startStr).toBe('2026-01-01');
            expect(endStr).toBe('2026-12-31');
        });
    });
});

// ─── navigateDate ─────────────────────────────────────────────────

describe('navigateDate', () => {
    it('advances month by 1', () => {
        const result = navigateDate('month', new Date(2026, 1, 10), 1);
        expect(result.getMonth()).toBe(2); // March
        expect(result.getFullYear()).toBe(2026);
    });

    it('goes back month by 1', () => {
        const result = navigateDate('month', new Date(2026, 0, 10), -1);
        expect(result.getMonth()).toBe(11); // December
        expect(result.getFullYear()).toBe(2025);
    });

    it('advances quarter by 1 (3 months)', () => {
        const result = navigateDate('quarter', new Date(2026, 0, 10), 1);
        expect(result.getMonth()).toBe(3); // April
    });

    it('advances year by 1', () => {
        const result = navigateDate('year', new Date(2026, 5, 15), 1);
        expect(result.getFullYear()).toBe(2027);
    });

    it('goes back year by 1', () => {
        const result = navigateDate('year', new Date(2026, 5, 15), -1);
        expect(result.getFullYear()).toBe(2025);
    });
});

// ─── getPeriodLabel ───────────────────────────────────────────────

describe('getPeriodLabel', () => {
    it('returns month label like "February 2026"', () => {
        const label = getPeriodLabel('month', new Date(2026, 1, 10));
        expect(label).toContain('February');
        expect(label).toContain('2026');
    });

    it('returns quarter label like "Q1 2026"', () => {
        const label = getPeriodLabel('quarter', new Date(2026, 0, 10));
        expect(label).toBe('Q1 2026');
    });

    it('returns Q2 for April', () => {
        expect(getPeriodLabel('quarter', new Date(2026, 3, 10))).toBe('Q2 2026');
    });

    it('returns year label "2026"', () => {
        expect(getPeriodLabel('year', new Date(2026, 5, 15))).toBe('2026');
    });
});

// ─── calculateStreaks ─────────────────────────────────────────────

function makeDay(date: string, wearCount: number): HeatmapDay {
    return { date, wearCount, intensity: wearCount > 0 ? 1 : 0, isToday: false };
}

describe('calculateStreaks', () => {
    it('returns 0,0 for empty array', () => {
        const { currentStreak, longestStreak } = calculateStreaks([]);
        expect(currentStreak).toBe(0);
        expect(longestStreak).toBe(0);
    });

    it('returns 0,0 for all-zero days', () => {
        const days = [
            makeDay('2026-01-01', 0),
            makeDay('2026-01-02', 0),
            makeDay('2026-01-03', 0),
        ];
        const { currentStreak, longestStreak } = calculateStreaks(days);
        expect(currentStreak).toBe(0);
        expect(longestStreak).toBe(0);
    });

    it('finds longest streak: [1,1,1,0,1,1] → longest=3', () => {
        const days = [
            makeDay('2026-01-01', 1),
            makeDay('2026-01-02', 1),
            makeDay('2026-01-03', 1),
            makeDay('2026-01-04', 0),
            makeDay('2026-01-05', 1),
            makeDay('2026-01-06', 1),
        ];
        const { longestStreak } = calculateStreaks(days);
        expect(longestStreak).toBe(3);
    });

    it('finds longest streak for all active days', () => {
        const days = [
            makeDay('2026-01-01', 2),
            makeDay('2026-01-02', 1),
            makeDay('2026-01-03', 3),
        ];
        const { longestStreak } = calculateStreaks(days);
        expect(longestStreak).toBe(3);
    });

    it('single active day = streak 1', () => {
        const days = [makeDay('2026-01-01', 0), makeDay('2026-01-02', 1)];
        const { longestStreak } = calculateStreaks(days);
        expect(longestStreak).toBe(1);
    });
});

// ─── getHeatmapData (integration) ────────────────────────────────

describe('getHeatmapData', () => {
    beforeEach(() => jest.clearAllMocks());

    function setupSupabase(wornDates: string[]) {
        mockFrom.mockImplementation(() => ({
            select: () => ({
                eq: () => ({
                    gte: () => ({
                        lte: () => Promise.resolve({
                            data: wornDates.map(d => ({ worn_date: d })),
                            error: null,
                        }),
                    }),
                }),
            }),
        }));
    }

    it('generates correct number of days for February 2026 (28 days)', async () => {
        setupSupabase([]);
        const ref = new Date(2026, 1, 10);
        const data = await getHeatmapData('month', ref);
        expect(data.days.length).toBe(28);
    });

    it('generates 365 days for year 2026', async () => {
        setupSupabase([]);
        const data = await getHeatmapData('year', new Date(2026, 0, 1));
        expect(data.days.length).toBe(365);
    });

    it('fills missing days with wearCount=0', async () => {
        setupSupabase(['2026-02-10']); // only one log
        const data = await getHeatmapData('month', new Date(2026, 1, 10));
        const zeroDays = data.days.filter(d => d.wearCount === 0);
        expect(zeroDays.length).toBe(27); // 28 total - 1 with data
    });

    it('maps intensity correctly for logged days', async () => {
        setupSupabase(['2026-02-01', '2026-02-01', '2026-02-01', '2026-02-01']); // 4 wears on same day
        const data = await getHeatmapData('month', new Date(2026, 1, 5));
        const feb1 = data.days.find(d => d.date === '2026-02-01');
        expect(feb1).toBeDefined();
        expect(feb1!.wearCount).toBe(4);
        expect(feb1!.intensity).toBe(3); // 4 wears → intensity 3
    });

    it('sets activeDays correctly', async () => {
        setupSupabase(['2026-02-01', '2026-02-03', '2026-02-05']);
        const data = await getHeatmapData('month', new Date(2026, 1, 5));
        expect(data.activeDays).toBe(3);
    });

    it('sets totalWears correctly', async () => {
        setupSupabase(['2026-02-01', '2026-02-01', '2026-02-03']); // 3 log entries
        const data = await getHeatmapData('month', new Date(2026, 1, 5));
        expect(data.totalWears).toBe(3);
    });

    it('includes insight text with active/total days', async () => {
        setupSupabase(['2026-02-10', '2026-02-11', '2026-02-12']);
        const data = await getHeatmapData('month', new Date(2026, 1, 15));
        expect(data.insight).toContain('3 of 28');
    });

    it('marks today correctly', async () => {
        setupSupabase([]);
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const data = await getHeatmapData('month', today);
        const todayCell = data.days.find(d => d.isToday);
        expect(todayCell).toBeDefined();
        expect(todayCell!.date).toBe(todayStr);
    });

    it('returns empty days array structure for date range with no logs', async () => {
        setupSupabase([]);
        const data = await getHeatmapData('month', new Date(2026, 1, 1));
        expect(data.days.every(d => d.wearCount === 0)).toBe(true);
        expect(data.days.every(d => d.intensity === 0)).toBe(true);
        expect(data.currentStreak).toBe(0);
        expect(data.longestStreak).toBe(0);
    });
});
