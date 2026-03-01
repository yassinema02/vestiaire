/**
 * Steal This Look Service
 * AI-powered matching of friend's outfit items to user's wardrobe.
 * Story 9.5: "Steal This Look"
 */

import Constants from 'expo-constants';
import { OotdPostWithAuthor, StealMatchResult, StealLookResult } from '../types/social';
import { ootdService } from './ootdService';
import { itemsService, WardrobeItem } from './items';
import { buildStealLookPrompt } from '../constants/prompts';
import { trackedGenerateContent } from './aiUsageLogger';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';

interface TaggedItemInfo {
    id: string;
    name: string | null;
    category: string | null;
    colors: string[];
    image_url: string;
}

/**
 * Main entry: analyze a friend's post and find matching items in user's wardrobe.
 */
async function analyzeLook(
    post: OotdPostWithAuthor
): Promise<{ result: StealLookResult | null; error: string | null }> {
    try {
        if (!post.tagged_item_ids || post.tagged_item_ids.length === 0) {
            return { result: null, error: 'No tagged items in this post' };
        }

        // 1. Fetch friend's tagged items with full details
        const { items: rawTaggedItems, error: taggedError } = await ootdService.getItemsByIds(
            post.tagged_item_ids
        );
        if (taggedError || rawTaggedItems.length === 0) {
            return { result: null, error: 'Could not load tagged items' };
        }

        // Enrich tagged items with color info from the items table
        const taggedItems: TaggedItemInfo[] = await enrichTaggedItems(rawTaggedItems);

        // 2. Fetch user's wardrobe
        const { items: wardrobeItems, error: wardrobeError } = await itemsService.getItems();
        if (wardrobeError) {
            return { result: null, error: 'Could not load your wardrobe' };
        }

        const completeItems = wardrobeItems.filter((i) => i.status === 'complete');

        // 3. Match items - try AI first, fallback to attribute-based
        let matches: StealMatchResult[];
        const aiConfigured = !!GEMINI_API_KEY && GEMINI_API_KEY !== 'your_api_key_here';

        if (aiConfigured) {
            try {
                matches = await matchWithAI(taggedItems, completeItems);
            } catch (err) {
                console.warn('AI matching failed, using fallback:', err);
                matches = matchWithFallback(taggedItems, completeItems);
            }
        } else {
            matches = matchWithFallback(taggedItems, completeItems);
        }

        // 4. Calculate overall score
        const overallScore =
            matches.length > 0
                ? Math.round(matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length)
                : 0;

        const canRecreate = matches.length > 0 && matches.every((m) => m.matchType !== 'missing');

        return {
            result: {
                postId: post.id,
                matches,
                overallScore,
                canRecreate,
            },
            error: null,
        };
    } catch (error) {
        console.error('analyzeLook error:', error);
        return { result: null, error: 'Failed to analyze look' };
    }
}

/**
 * Enrich tagged items with color data from the full items table.
 */
async function enrichTaggedItems(
    rawItems: Array<{ id: string; name: string | null; category: string | null; image_url: string; processed_image_url: string | null }>
): Promise<TaggedItemInfo[]> {
    // Fetch full item details for colors
    const enriched: TaggedItemInfo[] = [];
    for (const raw of rawItems) {
        const { item } = await itemsService.getItem(raw.id);
        enriched.push({
            id: raw.id,
            name: raw.name,
            category: raw.category || 'unknown',
            colors: item?.colors || [],
            image_url: raw.processed_image_url || raw.image_url,
        });
    }
    return enriched;
}

/**
 * AI-powered batch matching using Gemini.
 * Sends ONE prompt with all target items for efficiency.
 */
async function matchWithAI(
    targets: TaggedItemInfo[],
    userItems: WardrobeItem[]
): Promise<StealMatchResult[]> {
    // Build wardrobe summary grouped by category for token efficiency
    const wardrobeSummary = userItems.map((i) => ({
        id: i.id,
        name: i.name || null,
        category: i.category || 'unknown',
        sub_category: i.sub_category || null,
        colors: i.colors || [],
        brand: i.brand || null,
    }));

    const targetsSummary = targets.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        colors: t.colors,
    }));

    const prompt = buildStealLookPrompt(
        JSON.stringify(targetsSummary, null, 2),
        JSON.stringify(wardrobeSummary, null, 2)
    );

    const result = await trackedGenerateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
    }, 'steal_look');

    const text = result.text;
    if (!text) throw new Error('No response from Gemini');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse AI response');

    const parsed = JSON.parse(jsonMatch[0]) as {
        matches: Array<{
            targetId: string;
            matchedItemId: string | null;
            matchType: 'exact' | 'similar' | 'missing';
            confidence: number;
            reason: string;
        }>;
    };

    // Validate and build StealMatchResult array
    const validUserIds = new Set(userItems.map((i) => i.id));
    const targetMap = new Map(targets.map((t) => [t.id, t]));
    const userMap = new Map(userItems.map((i) => [i.id, i]));

    const results: StealMatchResult[] = [];

    for (const target of targets) {
        const aiMatch = parsed.matches.find((m) => m.targetId === target.id);

        if (aiMatch && aiMatch.matchedItemId && validUserIds.has(aiMatch.matchedItemId)) {
            const matched = userMap.get(aiMatch.matchedItemId)!;
            results.push({
                originalItem: {
                    id: target.id,
                    name: target.name,
                    category: target.category || 'unknown',
                    color: target.colors[0] || 'unknown',
                    image_url: target.image_url,
                },
                matchType: aiMatch.matchType === 'exact' ? 'exact' : 'similar',
                matchedItem: {
                    id: matched.id,
                    name: matched.name || null,
                    category: matched.category || 'unknown',
                    color: (matched.colors || [])[0] || 'unknown',
                    image_url: matched.processed_image_url || matched.image_url,
                },
                matchReason: aiMatch.reason,
                confidence: Math.max(0, Math.min(100, aiMatch.confidence)),
            });
        } else if (aiMatch && aiMatch.matchType === 'missing') {
            results.push({
                originalItem: {
                    id: target.id,
                    name: target.name,
                    category: target.category || 'unknown',
                    color: target.colors[0] || 'unknown',
                    image_url: target.image_url,
                },
                matchType: 'missing',
                matchReason: aiMatch.reason || `You don't have a ${target.category} like this`,
                confidence: 0,
            });
        } else {
            // AI didn't return a match for this item - use fallback for it
            const fallback = fallbackMatchSingle(target, userItems);
            results.push(fallback);
        }
    }

    return results;
}

/**
 * Attribute-based fallback matching for all items.
 */
export function matchWithFallback(
    targets: TaggedItemInfo[],
    userItems: WardrobeItem[]
): StealMatchResult[] {
    return targets.map((target) => fallbackMatchSingle(target, userItems));
}

/**
 * Fallback match for a single target item.
 */
export function fallbackMatchSingle(
    target: TaggedItemInfo,
    userItems: WardrobeItem[]
): StealMatchResult {
    const originalItem = {
        id: target.id,
        name: target.name,
        category: target.category || 'unknown',
        color: target.colors[0] || 'unknown',
        image_url: target.image_url,
    };

    const targetColor = (target.colors[0] || '').toLowerCase();
    const targetCategory = (target.category || '').toLowerCase();

    // 1. Exact: same category + same color
    const exact = userItems.find((i) => {
        const itemCategory = (i.category || '').toLowerCase();
        const itemColors = (i.colors || []).map((c) => c.toLowerCase());
        return itemCategory === targetCategory && targetColor !== '' && itemColors.includes(targetColor);
    });

    if (exact) {
        return {
            originalItem,
            matchType: 'exact',
            matchedItem: {
                id: exact.id,
                name: exact.name || null,
                category: exact.category || 'unknown',
                color: (exact.colors || [])[0] || 'unknown',
                image_url: exact.processed_image_url || exact.image_url,
            },
            matchReason: `You have the same ${targetCategory}!`,
            confidence: 95,
        };
    }

    // 2. Similar: same category, different color
    const similar = userItems.find((i) => {
        const itemCategory = (i.category || '').toLowerCase();
        return itemCategory === targetCategory;
    });

    if (similar) {
        const similarColor = (similar.colors || [])[0] || 'unknown';
        return {
            originalItem,
            matchType: 'similar',
            matchedItem: {
                id: similar.id,
                name: similar.name || null,
                category: similar.category || 'unknown',
                color: similarColor,
                image_url: similar.processed_image_url || similar.image_url,
            },
            matchReason: `Try your ${similarColor} ${similar.category || 'item'} instead`,
            confidence: 60,
        };
    }

    // 3. Missing
    return {
        originalItem,
        matchType: 'missing',
        matchReason: `You don't have a ${targetCategory || 'similar item'} in your wardrobe`,
        confidence: 0,
    };
}

export const stealLookService = {
    analyzeLook,
    matchWithFallback,
    fallbackMatchSingle,
};
