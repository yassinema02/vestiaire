/**
 * AI Outfit Service
 * Generates outfit suggestions using Gemini AI with wardrobe, weather, and calendar context
 */

import Constants from 'expo-constants';
import { GoogleGenAI } from '@google/genai';
import { WardrobeItem } from './items';
import { buildCurrentContext, formatContextForPrompt } from './contextService';
import { Outfit, OutfitPosition } from '../types/outfit';
import { OccasionType } from '../utils/occasionDetector';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';

/**
 * AI-generated outfit suggestion
 */
export interface OutfitSuggestion {
    name: string;
    items: string[];  // Array of item IDs
    occasion: OccasionType;
    rationale: string;
}

/**
 * Response from AI outfit generation
 */
export interface OutfitGenerationResponse {
    suggestions: OutfitSuggestion[];
}

/**
 * Item summary for token-efficient AI consumption
 */
interface ItemSummary {
    id: string;
    category: string;
    subCategory: string;
    colors: string[];
    seasons: string[];
    name?: string;
}

/**
 * Check if AI outfit generation is configured
 */
export const isOutfitGenerationConfigured = (): boolean => {
    return !!GEMINI_API_KEY && GEMINI_API_KEY !== 'your_api_key_here';
};

/**
 * Format wardrobe items for token-efficient AI consumption
 * Limits to 50 most recent items and only essential properties
 */
const formatItemsForAI = (items: WardrobeItem[]): ItemSummary[] => {
    // Take most recent 50 items to stay within token limits
    const recentItems = items
        .filter(item => item.status === 'complete')
        .slice(0, 50);

    return recentItems.map(item => ({
        id: item.id,
        category: item.category || 'unknown',
        subCategory: item.sub_category || item.category || 'unknown',
        colors: item.colors || [],
        seasons: item.seasons || [],
        name: item.name,
    }));
};

/**
 * Build the AI prompt for outfit generation
 */
const buildOutfitPrompt = (items: ItemSummary[], contextText: string): string => {
    const itemsJson = JSON.stringify(items, null, 2);

    return `You are a professional fashion stylist helping someone choose outfits from their wardrobe.

CONTEXT:
${contextText}

AVAILABLE WARDROBE ITEMS:
${itemsJson}

TASK:
Generate 3 outfit suggestions that are:
1. Appropriate for the weather conditions
2. Suitable for the occasion/events
3. Stylish and well-coordinated

RULES:
- Each outfit MUST use items from the provided wardrobe (use exact item IDs)
- Each outfit needs: (top + bottom) OR dress, optionally add shoes/outerwear/accessories
- Consider color coordination and style consistency
- Match seasons and occasions from item metadata

Respond ONLY with valid JSON in this exact format:
{
  "suggestions": [
    {
      "name": "Outfit Name",
      "items": ["item-id-1", "item-id-2", "item-id-3"],
      "occasion": "work",
      "rationale": "Why this outfit works..."
    }
  ]
}

Valid occasions: casual, work, formal, sport, social`;
};

/**
 * Generate outfit suggestions using Gemini AI
 */
export const generateOutfitSuggestions = async (
    wardrobeItems: WardrobeItem[]
): Promise<{ suggestions: OutfitSuggestion[] | null; error: Error | null }> => {
    if (!isOutfitGenerationConfigured()) {
        console.warn('AI outfit generation not configured - missing Gemini API key');
        return {
            suggestions: null,
            error: new Error('AI outfit generation not configured'),
        };
    }

    // Check minimum wardrobe size
    const completeItems = wardrobeItems.filter(i => i.status === 'complete');
    if (completeItems.length < 3) {
        return {
            suggestions: null,
            error: new Error('Add at least 3 items to your wardrobe for outfit suggestions'),
        };
    }

    try {
        console.log('Generating outfit suggestions...');

        // Get current context (weather, events)
        const context = buildCurrentContext();
        const contextText = formatContextForPrompt(context);

        // Format items for AI
        const itemSummaries = formatItemsForAI(wardrobeItems);

        // Build prompt
        const prompt = buildOutfitPrompt(itemSummaries, contextText);

        // Call Gemini
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

        const result = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });

        const text = result.text;
        if (!text) {
            throw new Error('No text response from Gemini');
        }

        // Parse JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response');
        }

        const parsed = JSON.parse(jsonMatch[0]) as OutfitGenerationResponse;

        // Validate suggestions
        const validItemIds = new Set(wardrobeItems.map(i => i.id));
        const validatedSuggestions = parsed.suggestions
            .map(suggestion => ({
                ...suggestion,
                // Filter out invalid item IDs
                items: suggestion.items.filter(id => validItemIds.has(id)),
                // Ensure valid occasion
                occasion: validateOccasion(suggestion.occasion),
            }))
            // Only keep suggestions with at least 2 valid items
            .filter(s => s.items.length >= 2);

        if (validatedSuggestions.length === 0) {
            throw new Error('No valid outfit suggestions generated');
        }

        console.log('Validated suggestions:', validatedSuggestions.length);
        return { suggestions: validatedSuggestions, error: null };
    } catch (error) {
        console.error('Outfit generation failed:', error);
        return { suggestions: null, error: error as Error };
    }
};

/**
 * Validate and normalize occasion type
 */
const validateOccasion = (occasion: string): OccasionType => {
    const validOccasions: OccasionType[] = ['casual', 'work', 'formal', 'sport', 'social'];
    if (validOccasions.includes(occasion as OccasionType)) {
        return occasion as OccasionType;
    }
    return 'casual';
};

/**
 * Generate fallback outfit when AI fails
 * Creates a simple matching outfit from available items
 */
export const generateFallbackOutfit = (
    wardrobeItems: WardrobeItem[]
): OutfitSuggestion | null => {
    const completeItems = wardrobeItems.filter(i => i.status === 'complete');

    // Find items by category
    const findByCategory = (cat: string) =>
        completeItems.find(i => i.category === cat);

    // Try to build a basic outfit
    const top = findByCategory('tops');
    const bottom = findByCategory('bottoms');
    const dress = findByCategory('dresses');
    const shoes = findByCategory('shoes');
    const outerwear = findByCategory('outerwear');

    const outfitItems: string[] = [];

    if (dress) {
        outfitItems.push(dress.id);
    } else if (top && bottom) {
        outfitItems.push(top.id, bottom.id);
    } else {
        return null; // Can't build a valid outfit
    }

    if (shoes) outfitItems.push(shoes.id);
    if (outerwear) outfitItems.push(outerwear.id);

    return {
        name: 'Quick Outfit',
        items: outfitItems,
        occasion: 'casual',
        rationale: 'A simple outfit combination from your wardrobe.',
    };
};

/**
 * Generate outfits with fallback support
 */
export const generateOutfitsWithFallback = async (
    wardrobeItems: WardrobeItem[]
): Promise<{ suggestions: OutfitSuggestion[]; fromAI: boolean }> => {
    // Try AI generation first
    const { suggestions, error } = await generateOutfitSuggestions(wardrobeItems);

    if (suggestions && suggestions.length > 0) {
        return { suggestions, fromAI: true };
    }

    // Fallback to simple matching
    console.log('Using fallback outfit generation:', error?.message);
    const fallback = generateFallbackOutfit(wardrobeItems);

    if (fallback) {
        return { suggestions: [fallback], fromAI: false };
    }

    return { suggestions: [], fromAI: false };
};

export const aiOutfitService = {
    isConfigured: isOutfitGenerationConfigured,
    generate: generateOutfitSuggestions,
    generateWithFallback: generateOutfitsWithFallback,
    generateFallback: generateFallbackOutfit,
};
