/**
 * Heatmap Service
 * Story 11.5: Wear Frequency Heatmap
 * Fetches wear_logs, builds per-day intensity data, computes streaks.
 */

import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';
import { HeatmapView, HeatmapDay, HeatmapData, DayDetail } from '../types/heatmap';

// ─── Intensity mapping ────────────────────────────────────────────

export function getIntensity(count: number): 0 | 1 | 2 | 3 | 4 {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 5) return 3;
    return 4;
}

// ─── Date range helpers ───────────────────────────────────────────

/**
 * Returns ISO date strings for the start/end of the given view period.
 * Quarter: Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec based on the reference month.
 */
export function getDateRange(
    view: HeatmapView,
    referenceDate: Date = new Date()
): { startStr: string; endStr: string } {
    const y = referenceDate.getFullYear();
    const m = referenceDate.getMonth(); // 0-based

    let startDate: Date;
    let endDate: Date;

    if (view === 'month') {
        startDate = new Date(y, m, 1);
        endDate = new Date(y, m + 1, 0); // last day of month
    } else if (view === 'quarter') {
        const quarterStart = Math.floor(m / 3) * 3; // 0, 3, 6, 9
        startDate = new Date(y, quarterStart, 1);
        endDate = new Date(y, quarterStart + 3, 0);
    } else {
        // year
        startDate = new Date(y, 0, 1);
        endDate = new Date(y, 11, 31);
    }

    return {
        startStr: startDate.toISOString().split('T')[0],
        endStr: endDate.toISOString().split('T')[0],
    };
}

/**
 * Navigate referenceDate by ±1 period (month/quarter/year).
 */
export function navigateDate(
    view: HeatmapView,
    referenceDate: Date,
    direction: 1 | -1
): Date {
    const d = new Date(referenceDate);
    if (view === 'month') {
        d.setMonth(d.getMonth() + direction);
    } else if (view === 'quarter') {
        d.setMonth(d.getMonth() + direction * 3);
    } else {
        d.setFullYear(d.getFullYear() + direction);
    }
    return d;
}

/**
 * Returns a human-readable label for the current period.
 * e.g. "February 2026", "Q1 2026", "2026"
 */
export function getPeriodLabel(view: HeatmapView, referenceDate: Date): string {
    const y = referenceDate.getFullYear();
    const m = referenceDate.getMonth();

    if (view === 'month') {
        return referenceDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (view === 'quarter') {
        const q = Math.floor(m / 3) + 1;
        return `Q${q} ${y}`;
    } else {
        return String(y);
    }
}

// ─── Streak calculation ───────────────────────────────────────────

export function calculateStreaks(days: HeatmapDay[]): {
    currentStreak: number;
    longestStreak: number;
} {
    if (days.length === 0) return { currentStreak: 0, longestStreak: 0 };

    // Longest streak: max consecutive days with wearCount > 0
    let longestStreak = 0;
    let run = 0;
    for (const day of days) {
        if (day.wearCount > 0) {
            run++;
            if (run > longestStreak) longestStreak = run;
        } else {
            run = 0;
        }
    }

    // Current streak: consecutive days with activity counting back from
    // today (or yesterday if today has no data yet).
    const today = new Date().toISOString().split('T')[0];
    const todayIdx = days.findIndex(d => d.date === today);

    // Start from today if in range, else from the last day
    const startIdx = todayIdx >= 0 ? todayIdx : days.length - 1;

    // If today is in range but has no wear and yesterday does, start from yesterday
    let idx = startIdx;
    if (idx >= 0 && days[idx].wearCount === 0 && idx > 0) {
        idx = idx - 1;
    }

    let currentStreak = 0;
    for (let i = idx; i >= 0; i--) {
        if (days[i].wearCount > 0) {
            currentStreak++;
        } else {
            break;
        }
    }

    return { currentStreak, longestStreak };
}

// ─── Core data fetch ──────────────────────────────────────────────

export async function getHeatmapData(
    view: HeatmapView,
    referenceDate: Date = new Date()
): Promise<HeatmapData> {
    const userId = await requireUserId();
    const { startStr, endStr } = getDateRange(view, referenceDate);

    const { data: logs } = await supabase
        .from('wear_logs')
        .select('worn_date')
        .eq('user_id', userId)
        .gte('worn_date', startStr)
        .lte('worn_date', endStr);

    // Count wears per date
    const countByDate: Record<string, number> = {};
    for (const log of logs || []) {
        const d = (log as any).worn_date as string;
        countByDate[d] = (countByDate[d] || 0) + 1;
    }

    // Fill every day in range
    const days: HeatmapDay[] = [];
    const cursor = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    const today = new Date().toISOString().split('T')[0];

    while (cursor <= end) {
        const dateStr = cursor.toISOString().split('T')[0];
        const count = countByDate[dateStr] || 0;
        days.push({
            date: dateStr,
            wearCount: count,
            intensity: getIntensity(count),
            isToday: dateStr === today,
        });
        cursor.setDate(cursor.getDate() + 1);
    }

    const { currentStreak, longestStreak } = calculateStreaks(days);
    const activeDays = days.filter(d => d.wearCount > 0).length;
    const totalWears = Object.values(countByDate).reduce((s, n) => s + n, 0);

    return {
        days,
        view,
        startDate: startStr,
        endDate: endStr,
        activeDays,
        totalWears,
        currentStreak,
        longestStreak,
        insight: `You logged outfits ${activeDays} of ${days.length} days`,
    };
}

// ─── Day detail ───────────────────────────────────────────────────

export async function getDayDetail(date: string): Promise<DayDetail> {
    const userId = await requireUserId();

    const { data: logs } = await supabase
        .from('wear_logs')
        .select('item_id, items(name, sub_category, category)')
        .eq('user_id', userId)
        .eq('worn_date', date);

    const itemNames = (logs || []).map((log: any) => {
        const item = log.items;
        return item?.name || item?.sub_category || item?.category || 'Item';
    });

    return { date, itemNames };
}

// ─── Public service ───────────────────────────────────────────────

export const heatmapService = {
    getHeatmapData,
    getDayDetail,
    getDateRange,
    navigateDate,
    getPeriodLabel,
};
