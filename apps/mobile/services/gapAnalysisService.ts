/**
 * Gap Analysis Service
 * Story 11.3: Wardrobe Gap Analysis
 * Rule-based + AI (Gemini) detection, AsyncStorage cache, dismissal.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { WardrobeItem } from './items';
import { CATEGORIES } from './aiCategorization';
import { WardrobeGap, GapCategory, GapSeverity, GapAnalysisResult } from '../types/gapAnalysis';
import { UserProfile } from '../types/userProfile';
import { requireUserId } from './auth-helpers';
import { userProfileService } from './userProfileService';
import { buildGapAnalysisPrompt } from '../constants/prompts';
import { trackedGenerateContent } from './aiUsageLogger';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_AI_GAPS = 8;

// Dark color family names (used for color gap detection)
const DARK_COLORS = new Set(['Black', 'Navy', 'Gray', 'Burgundy', 'Brown', 'Olive', 'Teal']);

// Season to current month mapping
const CURRENT_MONTH = new Date().getMonth(); // 0-11
function getCurrentSeason(): string {
    if (CURRENT_MONTH >= 2 && CURRENT_MONTH <= 4) return 'spring';
    if (CURRENT_MONTH >= 5 && CURRENT_MONTH <= 7) return 'summer';
    if (CURRENT_MONTH >= 8 && CURRENT_MONTH <= 10) return 'fall';
    return 'winter';
}

// Severity sort order
const SEVERITY_ORDER: Record<GapSeverity, number> = { critical: 0, important: 1, optional: 2 };
const TYPE_ORDER: Record<GapCategory, number> = { category: 0, formality: 1, color: 2, weather: 3 };

function sortGaps(gaps: WardrobeGap[]): WardrobeGap[] {
    return [...gaps].sort((a, b) => {
        const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        if (sev !== 0) return sev;
        return TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
    });
}

// Categories skipped in gap analysis per gender
const GENDER_SKIP_CATEGORIES: Record<string, string[]> = {
    man: ['dresses'],
    woman: [],
};

// Keywords in AI gap titles/suggestions that should be filtered per gender
const GENDER_SKIP_KEYWORDS: Record<string, RegExp> = {
    man: /\b(dress|dresses|skirt|skirts|heels|high.?heels|blouse|blouses|crop.?top|leggings|flats|ballet.?flats|romper|rompers|jumpsuit)\b/i,
    woman: /\b(jockstrap)\b/i, // minimal exclusions — most items are unisex
};

// ─── Rule-Based Gap Detection ────────────────────────────────────

export function detectBasicGaps(items: WardrobeItem[], gender?: string): WardrobeGap[] {
    const gaps: WardrobeGap[] = [];
    const skipCats = new Set((gender && GENDER_SKIP_CATEGORIES[gender]) || []);

    if (items.length === 0) {
        // Empty wardrobe — critical gap for all categories
        for (const cat of Object.keys(CATEGORIES)) {
            if (skipCats.has(cat)) continue;
            gaps.push(makeGap(`cat-${cat}`, 'category', 'critical',
                `No ${cat}`,
                `You have no ${cat} in your wardrobe.`,
                `Consider adding some ${cat} to start building your wardrobe.`
            ));
        }
        return sortGaps(gaps);
    }

    // ── Category gaps ──────────────────────────────────────────
    const categoryCounts: Record<string, number> = {};
    for (const item of items) {
        if (item.category) {
            categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
        }
    }

    for (const cat of Object.keys(CATEGORIES)) {
        if (skipCats.has(cat)) continue;
        const count = categoryCounts[cat] || 0;
        if (count === 0) {
            gaps.push(makeGap(`cat-${cat}`, 'category', 'critical',
                `No ${capitalize(cat)}`,
                `You have no ${cat} in your wardrobe.`,
                `Consider adding some ${cat} to complete your wardrobe.`
            ));
        } else if (count === 1) {
            gaps.push(makeGap(`cat-low-${cat}`, 'category', 'important',
                `Only 1 ${capitalize(cat)} item`,
                `You only have 1 ${cat} item — limited variety.`,
                `Add another ${cat} piece for more outfit combinations.`
            ));
        }
    }

    // ── Color gaps ─────────────────────────────────────────────
    const allColors: string[] = [];
    for (const item of items) {
        for (const color of (item.colors || [])) {
            allColors.push(color);
        }
    }

    if (allColors.length > 0) {
        const darkCount = allColors.filter(c => DARK_COLORS.has(c)).length;
        const darkPct = (darkCount / allColors.length) * 100;
        if (darkPct > 70) {
            gaps.push(makeGap('color-dark', 'color', 'important',
                'Limited color variety',
                `${Math.round(darkPct)}% of your items are dark colors.`,
                'Add items in lighter or brighter colors for a balanced, versatile wardrobe.'
            ));
        }
    }

    // ── Season gaps ────────────────────────────────────────────
    const currentSeason = getCurrentSeason();
    const seasonItems = items.filter(i => (i.seasons || []).includes(currentSeason));
    if (items.length >= 5 && seasonItems.length < 3) {
        gaps.push(makeGap(`season-${currentSeason}`, 'weather', 'important',
            `Low ${capitalize(currentSeason)} readiness`,
            `Only ${seasonItems.length} item${seasonItems.length !== 1 ? 's' : ''} tagged for ${currentSeason}.`,
            `Tag your ${currentSeason}-appropriate items or add new ${currentSeason} pieces.`
        ));
    }

    // ── Formality gaps ─────────────────────────────────────────
    const formalItems = items.filter(i =>
        (i.occasions || []).some(o => ['formal', 'business', 'work'].includes(o.toLowerCase()))
    );
    if (items.length >= 5 && formalItems.length === 0) {
        gaps.push(makeGap('formality-no-formal', 'formality', 'important',
            'No formal options',
            'None of your items are tagged for formal or business occasions.',
            'Consider adding a formal outfit for professional or special occasion needs.'
        ));
    }

    return sortGaps(gaps);
}

function makeGap(
    id: string,
    type: GapCategory,
    severity: GapSeverity,
    title: string,
    description: string,
    suggestion: string
): WardrobeGap {
    return { id, type, severity, title, description, suggestion, dismissed: false };
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── AI Gap Detection ─────────────────────────────────────────────

function buildWardrobeSummary(items: WardrobeItem[], profile?: UserProfile): string {
    const catCounts: Record<string, number> = {};
    const colorCounts: Record<string, number> = {};
    const seasonCounts: Record<string, number> = {};
    const occasionCounts: Record<string, number> = {};

    for (const item of items) {
        if (item.category) catCounts[item.category] = (catCounts[item.category] || 0) + 1;
        for (const c of item.colors || []) colorCounts[c] = (colorCounts[c] || 0) + 1;
        for (const s of item.seasons || []) seasonCounts[s] = (seasonCounts[s] || 0) + 1;
        for (const o of item.occasions || []) occasionCounts[o] = (occasionCounts[o] || 0) + 1;
    }

    const ageStr = profile?.birth_year
        ? `Age: ~${new Date().getFullYear() - profile.birth_year}`
        : null;

    return [
        `Total items: ${items.length}`,
        profile?.gender ? `User gender: ${profile.gender}` : null,
        ageStr,
        profile?.style_tags?.length ? `Style preferences: ${profile.style_tags.join(', ')}` : null,
        `Categories: ${JSON.stringify(catCounts)}`,
        `Colors: ${JSON.stringify(colorCounts)}`,
        `Seasons tagged: ${JSON.stringify(seasonCounts)}`,
        `Occasions: ${JSON.stringify(occasionCounts)}`,
        `Current season: ${getCurrentSeason()}`,
    ].filter(Boolean).join('\n');
}

// Prompt moved to constants/prompts.ts as buildGapAnalysisPrompt()

async function analyzeGapsWithAI(items: WardrobeItem[], profile?: UserProfile): Promise<WardrobeGap[]> {
    if (!GEMINI_API_KEY) return [];

    const summary = buildWardrobeSummary(items, profile);

    const result = await trackedGenerateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: buildGapAnalysisPrompt(MAX_AI_GAPS) + summary }] }],
    }, 'gap_analysis');

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const raw: any[] = JSON.parse(jsonMatch[0]);
    const skipPattern = profile?.gender ? GENDER_SKIP_KEYWORDS[profile.gender] : null;

    return raw
        .slice(0, MAX_AI_GAPS)
        .map((g, i) => ({
            id: `ai-${g.type}-${i}`,
            type: (g.type as GapCategory) || 'category',
            severity: (g.severity as GapSeverity) || 'optional',
            title: g.title || '',
            description: g.description || '',
            suggestion: g.suggestion || '',
            dismissed: false,
        }))
        .filter(g => g.title)
        .filter(g => {
            // Post-filter: remove AI gaps that mention gender-inappropriate items
            if (!skipPattern) return true;
            const text = `${g.title} ${g.description} ${g.suggestion}`;
            return !skipPattern.test(text);
        });
}

// ─── Merge rule-based + AI gaps ────────────────────────────────

function mergeGaps(ruleGaps: WardrobeGap[], aiGaps: WardrobeGap[]): WardrobeGap[] {
    // Deduplicate by type — if AI has a gap of same type+severity, prefer AI (richer description)
    const combined = [...ruleGaps];
    for (const aiGap of aiGaps) {
        const dup = combined.find(g => g.type === aiGap.type && g.severity === aiGap.severity
            && g.title.toLowerCase() === aiGap.title.toLowerCase());
        if (!dup) {
            combined.push(aiGap);
        }
    }
    return sortGaps(combined).slice(0, 12); // cap total at 12
}

// ─── AsyncStorage Cache ───────────────────────────────────────────

function cacheKey(userId: string) {
    return `gap_analysis_${userId}`;
}

function dismissedKey(userId: string) {
    return `dismissed_gaps_${userId}`;
}

async function getCachedAnalysis(userId: string): Promise<GapAnalysisResult | null> {
    const raw = await AsyncStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const { result, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) return null;
    return result as GapAnalysisResult;
}

async function setCachedAnalysis(userId: string, result: GapAnalysisResult): Promise<void> {
    await AsyncStorage.setItem(cacheKey(userId), JSON.stringify({ result, timestamp: Date.now() }));
}

async function getDismissedIds(userId: string): Promise<Set<string>> {
    const raw = await AsyncStorage.getItem(dismissedKey(userId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
}

async function saveDismissedIds(userId: string, ids: Set<string>): Promise<void> {
    await AsyncStorage.setItem(dismissedKey(userId), JSON.stringify(Array.from(ids)));
}

// ─── Public Service ───────────────────────────────────────────────

export const gapAnalysisService = {
    /**
     * Analyse wardrobe gaps. Returns cached result if < 24h old.
     * Applies dismissals from AsyncStorage.
     */
    analyzeWardrobe: async (
        items: WardrobeItem[],
        forceRefresh = false
    ): Promise<{ result: GapAnalysisResult; error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const dismissedIds = await getDismissedIds(userId);

            if (!forceRefresh) {
                const cached = await getCachedAnalysis(userId);
                if (cached) {
                    // Apply current dismissal state
                    const gaps = cached.gaps.map(g => ({
                        ...g,
                        dismissed: dismissedIds.has(g.id),
                    }));
                    return { result: { ...cached, gaps }, error: null };
                }
            }

            // Fetch user profile for profile-aware analysis (best-effort)
            let profile: UserProfile | undefined;
            try {
                profile = await userProfileService.getProfile();
            } catch { /* non-fatal */ }

            // Rule-based first (fast)
            const ruleGaps = detectBasicGaps(items, profile?.gender);

            // AI enrichment (async, best-effort)
            let aiGaps: WardrobeGap[] = [];
            try {
                aiGaps = await analyzeGapsWithAI(items, profile);
            } catch {
                // AI failure is non-fatal — use rule-based only
            }

            const allGaps = mergeGaps(ruleGaps, aiGaps);
            const active = allGaps.filter(g => !dismissedIds.has(g.id));
            const dismissed = allGaps.filter(g => dismissedIds.has(g.id));

            const result: GapAnalysisResult = {
                gaps: [
                    ...active,
                    ...dismissed.map(g => ({ ...g, dismissed: true })),
                ],
                totalGaps: active.length,
                criticalCount: active.filter(g => g.severity === 'critical').length,
                lastAnalyzedAt: new Date().toISOString(),
            };

            await setCachedAnalysis(userId, { ...result, gaps: allGaps }); // cache without dismissals applied

            return { result, error: null };
        } catch (error) {
            return {
                result: { gaps: [], totalGaps: 0, criticalCount: 0, lastAnalyzedAt: new Date().toISOString() },
                error: error as Error,
            };
        }
    },

    /**
     * Dismiss a gap (persisted in AsyncStorage).
     */
    dismissGap: async (gapId: string): Promise<void> => {
        const userId = await requireUserId();
        const ids = await getDismissedIds(userId);
        ids.add(gapId);
        await saveDismissedIds(userId, ids);
    },

    /**
     * Undismiss a gap.
     */
    undismissGap: async (gapId: string): Promise<void> => {
        const userId = await requireUserId();
        const ids = await getDismissedIds(userId);
        ids.delete(gapId);
        await saveDismissedIds(userId, ids);
    },

    /**
     * Invalidate cache so next call re-analyses.
     */
    invalidateCache: async (): Promise<void> => {
        try {
            const userId = await requireUserId();
            await AsyncStorage.removeItem(cacheKey(userId));
        } catch { /* ignore */ }
    },
};
