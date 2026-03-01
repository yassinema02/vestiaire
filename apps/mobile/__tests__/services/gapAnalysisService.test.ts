/**
 * Gap Analysis Service Tests
 * Story 11.3: Wardrobe Gap Analysis
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

// ─── expo-constants mock ─────────────────────────────────────────

jest.mock('expo-constants', () => ({
    expoConfig: { extra: { geminiApiKey: '' } },
}));

// ─── GoogleGenAI mock (no real API call) ─────────────────────────

jest.mock('@google/genai', () => ({
    GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: {
            generateContent: jest.fn().mockResolvedValue({
                candidates: [{ content: { parts: [{ text: '[]' }] } }],
            }),
        },
    })),
}));

// ─── auth-helpers mock ───────────────────────────────────────────

jest.mock('../../services/auth-helpers', () => ({
    requireUserId: jest.fn().mockResolvedValue('user-1'),
}));

// ─── userProfileService mock ────────────────────────────────────

jest.mock('../../services/userProfileService', () => ({
    userProfileService: {
        getProfile: jest.fn().mockResolvedValue({ gender: 'man', style_tags: ['minimalist'] }),
    },
}));

// ─── aiCategorization mock (provides CATEGORIES) ─────────────────

jest.mock('../../services/aiCategorization', () => ({
    CATEGORIES: {
        tops: ['t-shirt', 'shirt'],
        bottoms: ['jeans', 'pants'],
        dresses: ['casual-dress'],
        outerwear: ['jacket', 'coat'],
        shoes: ['sneakers', 'boots'],
        accessories: ['bag', 'hat'],
    },
}));

// ─── Import after mocks ───────────────────────────────────────────

import { detectBasicGaps, gapAnalysisService } from '../../services/gapAnalysisService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Helpers ─────────────────────────────────────────────────────

function makeItem(overrides: Partial<{
    id: string;
    category: string;
    colors: string[];
    seasons: string[];
    occasions: string[];
    wear_count: number;
}> = {}) {
    return {
        id: overrides.id || 'item-1',
        user_id: 'user-1',
        image_url: '',
        category: overrides.category,
        colors: overrides.colors || [],
        seasons: overrides.seasons || [],
        occasions: overrides.occasions || [],
        wear_count: overrides.wear_count || 0,
        is_favorite: false,
        status: 'complete' as const,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
    };
}

function makeWardrobe(counts: Record<string, number>): ReturnType<typeof makeItem>[] {
    const items: ReturnType<typeof makeItem>[] = [];
    let id = 0;
    for (const [category, count] of Object.entries(counts)) {
        for (let i = 0; i < count; i++) {
            items.push(makeItem({ id: `${category}-${id++}`, category }));
        }
    }
    return items;
}

// ─── detectBasicGaps tests ────────────────────────────────────────

describe('detectBasicGaps', () => {
    describe('category gaps', () => {
        it('returns critical gap for each missing category', () => {
            // Only tops — missing 5 categories
            const items = makeWardrobe({ tops: 5 });
            const gaps = detectBasicGaps(items);

            const missingCats = gaps.filter(g => g.type === 'category' && g.severity === 'critical');
            // Should have critical for: bottoms, dresses, outerwear, shoes, accessories
            expect(missingCats.length).toBe(5);
        });

        it('returns important gap when only 1 item in category', () => {
            const items = makeWardrobe({ tops: 5, bottoms: 5, dresses: 5, outerwear: 5, accessories: 5, shoes: 1 });
            const gaps = detectBasicGaps(items);

            const shoesGap = gaps.find(g => g.id === 'cat-low-shoes');
            expect(shoesGap).toBeDefined();
            expect(shoesGap!.severity).toBe('important');
        });

        it('returns no category gaps when all 6 categories have 2+ items', () => {
            const items = makeWardrobe({
                tops: 3, bottoms: 3, dresses: 2, outerwear: 2, shoes: 2, accessories: 2,
            });
            const gaps = detectBasicGaps(items);
            const catGaps = gaps.filter(g => g.type === 'category');
            expect(catGaps).toHaveLength(0);
        });

        it('returns all critical for empty wardrobe', () => {
            const gaps = detectBasicGaps([]);
            expect(gaps.every(g => g.severity === 'critical')).toBe(true);
            expect(gaps).toHaveLength(6); // one per category
        });
    });

    describe('color gaps', () => {
        it('returns important color gap when >70% items are dark colors', () => {
            const items = [
                ...Array.from({ length: 15 }, (_, i) => makeItem({ id: `b${i}`, category: 'tops', colors: ['Black'] })),
                ...Array.from({ length: 3 }, (_, i) => makeItem({ id: `w${i}`, category: 'tops', colors: ['White'] })),
                ...Array.from({ length: 2 }, (_, i) => makeItem({ id: `r${i}`, category: 'tops', colors: ['Pink'] })),
            ];
            const gaps = detectBasicGaps(items);
            const colorGap = gaps.find(g => g.id === 'color-dark');
            expect(colorGap).toBeDefined();
            expect(colorGap!.severity).toBe('important');
        });

        it('returns no color gap when color variety is good', () => {
            const items = [
                makeItem({ category: 'tops', colors: ['Black'] }),
                makeItem({ category: 'tops', colors: ['White'] }),
                makeItem({ category: 'tops', colors: ['Pink'] }),
                makeItem({ category: 'tops', colors: ['Blue'] }),
                makeItem({ category: 'tops', colors: ['Red'] }),
            ];
            const gaps = detectBasicGaps(items);
            const colorGap = gaps.find(g => g.type === 'color');
            expect(colorGap).toBeUndefined();
        });
    });

    describe('formality gaps', () => {
        it('returns important formality gap when no formal occasions', () => {
            // 6+ items, none formal
            const items = Array.from({ length: 6 }, (_, i) =>
                makeItem({ id: `i${i}`, category: 'tops', occasions: ['casual'] })
            );
            const gaps = detectBasicGaps(items);
            const formalGap = gaps.find(g => g.id === 'formality-no-formal');
            expect(formalGap).toBeDefined();
            expect(formalGap!.severity).toBe('important');
        });

        it('returns no formality gap when formal items exist', () => {
            const items = [
                ...Array.from({ length: 5 }, (_, i) => makeItem({ id: `c${i}`, category: 'tops', occasions: ['casual'] })),
                makeItem({ id: 'f1', category: 'tops', occasions: ['formal'] }),
            ];
            const gaps = detectBasicGaps(items);
            const formalGap = gaps.find(g => g.id === 'formality-no-formal');
            expect(formalGap).toBeUndefined();
        });

        it('does not add formality gap for small wardrobes (<5 items)', () => {
            const items = [makeItem({ category: 'tops', occasions: ['casual'] })];
            const gaps = detectBasicGaps(items);
            const formalGap = gaps.find(g => g.type === 'formality');
            expect(formalGap).toBeUndefined();
        });
    });

    describe('severity sorting', () => {
        it('returns critical gaps before important before optional', () => {
            // Missing outerwear (critical) + only 1 shoes (important)
            const items = makeWardrobe({ tops: 3, bottoms: 3, dresses: 2, shoes: 1, accessories: 2 });
            const gaps = detectBasicGaps(items);

            let lastSeverityOrder = -1;
            const SEVERITY_ORDER: Record<string, number> = { critical: 0, important: 1, optional: 2 };
            for (const g of gaps) {
                expect(SEVERITY_ORDER[g.severity]).toBeGreaterThanOrEqual(lastSeverityOrder);
                lastSeverityOrder = SEVERITY_ORDER[g.severity];
            }
        });
    });

    describe('dismissed flag', () => {
        it('all detected gaps start with dismissed: false', () => {
            const items = makeWardrobe({ tops: 3 });
            const gaps = detectBasicGaps(items);
            expect(gaps.every(g => g.dismissed === false)).toBe(true);
        });
    });

    describe('gender-aware filtering', () => {
        it('skips dresses category for men', () => {
            const items = makeWardrobe({ tops: 3 }); // missing many categories including dresses
            const gaps = detectBasicGaps(items, 'man');
            const dressGap = gaps.find(g => g.id === 'cat-dresses');
            expect(dressGap).toBeUndefined();
        });

        it('includes dresses category for women', () => {
            const items = makeWardrobe({ tops: 3 }); // missing dresses
            const gaps = detectBasicGaps(items, 'woman');
            const dressGap = gaps.find(g => g.id === 'cat-dresses');
            expect(dressGap).toBeDefined();
        });

        it('includes all categories when no gender specified', () => {
            const gaps = detectBasicGaps([]);
            expect(gaps).toHaveLength(6); // all 6 categories
        });

        it('returns 5 critical gaps for empty wardrobe when gender is man', () => {
            const gaps = detectBasicGaps([], 'man');
            expect(gaps).toHaveLength(5); // 6 minus dresses
            expect(gaps.find(g => g.id === 'cat-dresses')).toBeUndefined();
        });
    });
});

// ─── gapAnalysisService.dismissGap / undismissGap tests ──────────

describe('gapAnalysisService.dismissGap', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    });

    it('persists dismissed gap ID to AsyncStorage', async () => {
        await gapAnalysisService.dismissGap('cat-outerwear');
        const raw = await AsyncStorage.getItem('dismissed_gaps_user-1');
        const ids = JSON.parse(raw!);
        expect(ids).toContain('cat-outerwear');
    });

    it('undismissGap removes the ID from storage', async () => {
        await gapAnalysisService.dismissGap('cat-outerwear');
        await gapAnalysisService.undismissGap('cat-outerwear');
        const raw = await AsyncStorage.getItem('dismissed_gaps_user-1');
        const ids = JSON.parse(raw!);
        expect(ids).not.toContain('cat-outerwear');
    });
});

// ─── gapAnalysisService.analyzeWardrobe cache tests ──────────────

describe('gapAnalysisService.analyzeWardrobe', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    });

    it('returns cached result when cache is fresh', async () => {
        const cachedResult = {
            gaps: [],
            totalGaps: 0,
            criticalCount: 0,
            lastAnalyzedAt: new Date().toISOString(),
        };
        mockStorage['gap_analysis_user-1'] = JSON.stringify({
            result: cachedResult,
            timestamp: Date.now(),
        });

        const items = makeWardrobe({ tops: 3 });
        const { result } = await gapAnalysisService.analyzeWardrobe(items);

        // Should return cached (empty gaps), not recompute
        expect(result.totalGaps).toBe(0);
    });

    it('recomputes when forceRefresh is true', async () => {
        // Cache a "no gaps" result
        mockStorage['gap_analysis_user-1'] = JSON.stringify({
            result: { gaps: [], totalGaps: 0, criticalCount: 0, lastAnalyzedAt: new Date().toISOString() },
            timestamp: Date.now(),
        });

        // Force refresh with a wardrobe that has gaps
        const items = makeWardrobe({ tops: 3 }); // missing 5 categories
        const { result } = await gapAnalysisService.analyzeWardrobe(items, true);

        expect(result.criticalCount).toBeGreaterThan(0);
    });

    it('applies dismissals to returned gaps', async () => {
        // Pre-dismiss the outerwear gap
        mockStorage['dismissed_gaps_user-1'] = JSON.stringify(['cat-outerwear']);

        const items = makeWardrobe({ tops: 3 }); // triggers cat-outerwear critical
        const { result } = await gapAnalysisService.analyzeWardrobe(items, true);

        const outerwearGap = result.gaps.find(g => g.id === 'cat-outerwear');
        expect(outerwearGap?.dismissed).toBe(true);
    });

    it('totalGaps counts only non-dismissed gaps', async () => {
        // Pre-dismiss outerwear
        mockStorage['dismissed_gaps_user-1'] = JSON.stringify(['cat-outerwear']);

        const items = makeWardrobe({ tops: 3 });
        const { result } = await gapAnalysisService.analyzeWardrobe(items, true);

        const activeGaps = result.gaps.filter(g => !g.dismissed);
        expect(result.totalGaps).toBe(activeGaps.length);
    });
});
