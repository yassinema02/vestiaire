/**
 * useOutfitGeneration Hook
 * React hook for generating AI outfit suggestions
 */

import { useState, useCallback } from 'react';
import { OutfitSuggestion, aiOutfitService } from '../services/aiOutfitService';
import { itemsService, WardrobeItem } from '../services/items';
import { useOutfitStore } from '../stores/outfitStore';
import { buildCurrentContext } from '../services/contextService';

interface UseOutfitGenerationResult {
    suggestions: OutfitSuggestion[];
    isLoading: boolean;
    error: string | null;
    isFromAI: boolean;
    generate: () => Promise<void>;
    regenerate: () => Promise<void>;
    saveSuggestion: (suggestion: OutfitSuggestion) => Promise<boolean>;
    clearSuggestions: () => void;
}

export const useOutfitGeneration = (): UseOutfitGenerationResult => {
    const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFromAI, setIsFromAI] = useState(false);
    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);

    const { createOutfit } = useOutfitStore();

    /**
     * Generate new outfit suggestions
     */
    const generate = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Fetch current wardrobe items
            const { items, error: itemsError } = await itemsService.getItems();

            if (itemsError) {
                throw new Error('Failed to load wardrobe items');
            }

            setWardrobeItems(items);

            // Generate suggestions with fallback
            const result = await aiOutfitService.generateWithFallback(items);

            setSuggestions(result.suggestions);
            setIsFromAI(result.fromAI);

            if (result.suggestions.length === 0) {
                setError('Could not generate outfit suggestions. Try adding more items to your wardrobe.');
            }
        } catch (err) {
            console.error('Outfit generation error:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate outfits');
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Regenerate suggestions (clears current and generates new)
     */
    const regenerate = useCallback(async () => {
        setSuggestions([]);
        await generate();
    }, [generate]);

    /**
     * Save a suggestion to the user's outfits
     */
    const saveSuggestion = useCallback(async (suggestion: OutfitSuggestion): Promise<boolean> => {
        try {
            // Get current context for weather snapshot
            const context = buildCurrentContext();
            const weatherSnapshot = context.weather
                ? {
                    temperature: context.weather.temperature,
                    condition: context.weather.condition,
                    date: context.date,
                }
                : undefined;

            // Map items to positions based on wardrobe item categories
            const itemPositions = suggestion.items.map(itemId => {
                const item = wardrobeItems.find(i => i.id === itemId);
                const position = mapCategoryToPosition(item?.category);
                return { item_id: itemId, position };
            });

            const result = await createOutfit({
                name: suggestion.name,
                occasion: suggestion.occasion,
                is_ai_generated: true,
                weather_context: weatherSnapshot,
                items: itemPositions,
            });

            return result.success;
        } catch (err) {
            console.error('Failed to save outfit:', err);
            return false;
        }
    }, [wardrobeItems, createOutfit]);

    /**
     * Clear all suggestions
     */
    const clearSuggestions = useCallback(() => {
        setSuggestions([]);
        setError(null);
        setIsFromAI(false);
    }, []);

    return {
        suggestions,
        isLoading,
        error,
        isFromAI,
        generate,
        regenerate,
        saveSuggestion,
        clearSuggestions,
    };
};

/**
 * Map wardrobe category to outfit position
 */
const mapCategoryToPosition = (category?: string): import('../types/outfit').OutfitPosition => {
    switch (category) {
        case 'tops':
            return 'top';
        case 'bottoms':
            return 'bottom';
        case 'dresses':
            return 'dress';
        case 'outerwear':
            return 'outerwear';
        case 'shoes':
            return 'shoes';
        case 'accessories':
            return 'accessory';
        default:
            return 'accessory';
    }
};
