/**
 * AI Outfit Service
 * Generates outfit suggestions using Gemini AI with wardrobe, weather, and calendar context
 */

import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildOutfitSuggestionPrompt, buildEventOutfitPrompt as buildEventOutfitPromptTemplate } from '../constants/prompts';
import { trackedGenerateContent } from './aiUsageLogger';
import { WardrobeItem } from './items';
import { buildCurrentContext, formatContextForPrompt } from './contextService';
import { Outfit, OutfitPosition } from '../types/outfit';
import { OccasionType } from '../utils/occasionDetector';
import { getTimeOfDay, TimeOfDay } from '../types/context';
import { useWeatherStore } from '../stores/weatherStore';
import { CalendarEventRow } from './eventSyncService';

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
    return buildOutfitSuggestionPrompt(itemsJson, contextText);
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
        const result = await trackedGenerateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        }, 'outfit_gen');

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

// --- Event-Specific Outfit Generation (Story 12.3) ---

const EVENT_OUTFIT_CACHE_PREFIX = 'event_outfit_';
const EVENT_OUTFIT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get formality guidance text based on score
 */
export const getFormalityGuidance = (score: number): string => {
    if (score >= 7) return 'Business or formal dress code required';
    if (score >= 4) return 'Smart casual — polished but comfortable';
    return 'Casual comfortable';
};

/**
 * Get time-of-day for a specific event start time
 */
export const getEventTimeOfDay = (startTime: string): TimeOfDay => {
    const hour = new Date(startTime).getHours();
    return getTimeOfDay(hour);
};

/**
 * Build event-specific AI prompt
 */
const buildEventOutfitPromptLocal = (
    items: ItemSummary[],
    event: { title: string; event_type: string; formality_score: number; start_time: string; location?: string | null },
    weather?: { temperature: number; condition: string } | null
): string => {
    const itemsJson = JSON.stringify(items, null, 2);
    const timeOfDay = getEventTimeOfDay(event.start_time);
    const formalityGuide = getFormalityGuidance(event.formality_score || 3);

    const contextLines = [
        `Event: "${event.title}" (${event.event_type || 'casual'}, formality ${event.formality_score || 3}/10)`,
        `Time: ${timeOfDay} event`,
        weather ? `Weather: ${weather.temperature}°C, ${weather.condition}` : null,
        `Dress code guidance: ${formalityGuide}`,
        event.location ? `Location: ${event.location}` : null,
    ].filter(Boolean).join('\n');

    return buildEventOutfitPromptTemplate(itemsJson, contextLines, event.event_type || 'casual');
};

/**
 * Get cached event outfit
 */
const getCachedEventOutfit = async (eventId: string): Promise<OutfitSuggestion | null> => {
    try {
        const cached = await AsyncStorage.getItem(`${EVENT_OUTFIT_CACHE_PREFIX}${eventId}`);
        if (!cached) return null;

        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.generatedAt > EVENT_OUTFIT_TTL_MS) {
            await AsyncStorage.removeItem(`${EVENT_OUTFIT_CACHE_PREFIX}${eventId}`);
            return null;
        }

        return parsed.suggestion;
    } catch {
        return null;
    }
};

/**
 * Cache event outfit
 */
const cacheEventOutfit = async (eventId: string, suggestion: OutfitSuggestion): Promise<void> => {
    try {
        await AsyncStorage.setItem(
            `${EVENT_OUTFIT_CACHE_PREFIX}${eventId}`,
            JSON.stringify({ suggestion, generatedAt: Date.now() })
        );
    } catch {
        // Ignore cache write errors
    }
};

/**
 * Clear cached outfit for an event (used on regenerate)
 */
export const clearEventOutfitCache = async (eventId: string): Promise<void> => {
    try {
        await AsyncStorage.removeItem(`${EVENT_OUTFIT_CACHE_PREFIX}${eventId}`);
    } catch {
        // Ignore
    }
};

/**
 * Generate outfit for a specific calendar event
 */
export const generateEventOutfit = async (
    event: CalendarEventRow,
    wardrobeItems: WardrobeItem[],
    skipCache: boolean = false
): Promise<{ suggestion: OutfitSuggestion | null; fromCache: boolean; error: Error | null }> => {
    // Check cache first
    if (!skipCache) {
        const cached = await getCachedEventOutfit(event.id);
        if (cached) {
            return { suggestion: cached, fromCache: true, error: null };
        }
    }

    if (!isOutfitGenerationConfigured()) {
        const fallback = generateFallbackOutfit(wardrobeItems);
        if (fallback) {
            fallback.occasion = (event.event_type as OccasionType) || 'casual';
            fallback.rationale = `Simple outfit for your ${event.event_type || 'casual'} event.`;
            await cacheEventOutfit(event.id, fallback);
        }
        return { suggestion: fallback, fromCache: false, error: null };
    }

    const completeItems = wardrobeItems.filter(i => i.status === 'complete');
    if (completeItems.length < 3) {
        return { suggestion: null, fromCache: false, error: new Error('Add at least 3 items for suggestions') };
    }

    try {
        // Get weather
        const weatherState = useWeatherStore.getState();
        const weather = weatherState.weather
            ? { temperature: weatherState.weather.temp, condition: weatherState.weather.condition }
            : null;

        const itemSummaries = formatItemsForAI(wardrobeItems);
        const prompt = buildEventOutfitPromptLocal(itemSummaries, event, weather);

        const result = await trackedGenerateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        }, 'event_outfit_gen');

        const text = result.text;
        if (!text) throw new Error('No text response from Gemini');

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Failed to parse AI response');

        const parsed = JSON.parse(jsonMatch[0]) as OutfitSuggestion;

        // Validate item IDs
        const validItemIds = new Set(wardrobeItems.map(i => i.id));
        const suggestion: OutfitSuggestion = {
            name: parsed.name || `${event.title} Outfit`,
            items: (parsed.items || []).filter(id => validItemIds.has(id)),
            occasion: validateOccasion(parsed.occasion || event.event_type || 'casual'),
            rationale: parsed.rationale || '',
        };

        if (suggestion.items.length < 2) {
            throw new Error('Not enough valid items in suggestion');
        }

        await cacheEventOutfit(event.id, suggestion);
        return { suggestion, fromCache: false, error: null };
    } catch (error) {
        console.error('Event outfit generation failed:', error);

        // Fallback
        const fallback = generateFallbackOutfit(wardrobeItems);
        if (fallback) {
            fallback.occasion = (event.event_type as OccasionType) || 'casual';
            fallback.rationale = `Simple outfit for your ${event.event_type || 'casual'} event.`;
            await cacheEventOutfit(event.id, fallback);
        }
        return { suggestion: fallback, fromCache: false, error: error as Error };
    }
};

export const aiOutfitService = {
    isConfigured: isOutfitGenerationConfigured,
    generate: generateOutfitSuggestions,
    generateWithFallback: generateOutfitsWithFallback,
    generateFallback: generateFallbackOutfit,
    generateEventOutfit,
    clearEventOutfitCache,
    getFormalityGuidance,
    getEventTimeOfDay,
};
