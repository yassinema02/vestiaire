/**
 * Heatmap Types
 * Story 11.5: Wear Frequency Heatmap
 */

export type HeatmapView = 'month' | 'quarter' | 'year';

export interface HeatmapDay {
    date: string;                       // ISO date 'YYYY-MM-DD'
    wearCount: number;                  // items logged that day
    intensity: 0 | 1 | 2 | 3 | 4;     // 0=none, 1=light, 2=medium, 3=high, 4=max
    isToday: boolean;
}

export interface HeatmapData {
    days: HeatmapDay[];
    view: HeatmapView;
    startDate: string;
    endDate: string;
    // Stats
    activeDays: number;
    totalWears: number;
    currentStreak: number;
    longestStreak: number;
    insight: string;
}

export interface DayDetail {
    date: string;
    itemNames: string[];
}
