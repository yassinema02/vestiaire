/**
 * Gap Analysis Types
 * Story 11.3: Wardrobe Gap Analysis
 */

export type GapSeverity = 'critical' | 'important' | 'optional';
export type GapCategory = 'category' | 'formality' | 'color' | 'weather';

export interface WardrobeGap {
    id: string;
    type: GapCategory;
    severity: GapSeverity;
    title: string;
    description: string;
    suggestion: string;
    dismissed: boolean;
}

export interface GapAnalysisResult {
    gaps: WardrobeGap[];
    totalGaps: number;
    criticalCount: number;
    lastAnalyzedAt: string;
}
