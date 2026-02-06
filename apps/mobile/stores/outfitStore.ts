/**
 * Outfit Store
 * Zustand store for managing outfit state
 */

import { create } from 'zustand';
import { Outfit, CreateOutfitInput, UpdateOutfitInput } from '../types/outfit';
import { outfitService } from '../services/outfitService';

interface OutfitState {
    outfits: Outfit[];
    currentOutfit: Outfit | null;
    isLoading: boolean;
    error: string | null;
    hasMore: boolean;
    totalCount: number;
}

interface OutfitActions {
    // Fetch actions
    fetchOutfits: (options?: { refresh?: boolean; aiGeneratedOnly?: boolean }) => Promise<void>;
    fetchOutfit: (id: string) => Promise<void>;
    fetchOutfitCount: () => Promise<void>;

    // CRUD actions
    createOutfit: (input: CreateOutfitInput) => Promise<{ success: boolean; outfit?: Outfit }>;
    updateOutfit: (id: string, input: UpdateOutfitInput) => Promise<{ success: boolean }>;
    deleteOutfit: (id: string) => Promise<{ success: boolean }>;
    toggleFavorite: (id: string) => Promise<{ success: boolean }>;

    // State management
    setCurrentOutfit: (outfit: Outfit | null) => void;
    clearError: () => void;
    reset: () => void;
}

type OutfitStore = OutfitState & OutfitActions;

const ITEMS_PER_PAGE = 20;

export const useOutfitStore = create<OutfitStore>((set, get) => ({
    // Initial state
    outfits: [],
    currentOutfit: null,
    isLoading: false,
    error: null,
    hasMore: true,
    totalCount: 0,

    // Fetch outfits with pagination
    fetchOutfits: async (options) => {
        const state = get();

        // Reset if refreshing
        if (options?.refresh) {
            set({ outfits: [], hasMore: true });
        }

        if (state.isLoading) return;

        set({ isLoading: true, error: null });

        try {
            const offset = options?.refresh ? 0 : state.outfits.length;

            const { outfits, error } = await outfitService.getOutfits({
                limit: ITEMS_PER_PAGE,
                offset,
                aiGeneratedOnly: options?.aiGeneratedOnly,
            });

            if (error) {
                set({ error: error.message, isLoading: false });
                return;
            }

            const newOutfits = options?.refresh
                ? outfits
                : [...state.outfits, ...outfits];

            set({
                outfits: newOutfits,
                hasMore: outfits.length === ITEMS_PER_PAGE,
                isLoading: false,
            });
        } catch (error) {
            set({
                error: 'Failed to fetch outfits',
                isLoading: false,
            });
        }
    },

    // Fetch single outfit
    fetchOutfit: async (id) => {
        set({ isLoading: true, error: null });

        try {
            const { outfit, error } = await outfitService.getOutfit(id);

            if (error) {
                set({ error: error.message, isLoading: false });
                return;
            }

            set({ currentOutfit: outfit, isLoading: false });
        } catch (error) {
            set({
                error: 'Failed to fetch outfit',
                isLoading: false,
            });
        }
    },

    // Fetch total count
    fetchOutfitCount: async () => {
        const { count } = await outfitService.getOutfitCount();
        set({ totalCount: count });
    },

    // Create outfit
    createOutfit: async (input) => {
        set({ isLoading: true, error: null });

        try {
            const { outfit, error } = await outfitService.createOutfit(input);

            if (error || !outfit) {
                set({ error: error?.message || 'Failed to create outfit', isLoading: false });
                return { success: false };
            }

            // Add to beginning of list
            set(state => ({
                outfits: [outfit, ...state.outfits],
                totalCount: state.totalCount + 1,
                isLoading: false,
            }));

            return { success: true, outfit };
        } catch (error) {
            set({
                error: 'Failed to create outfit',
                isLoading: false,
            });
            return { success: false };
        }
    },

    // Update outfit
    updateOutfit: async (id, input) => {
        set({ isLoading: true, error: null });

        try {
            const { outfit, error } = await outfitService.updateOutfit(id, input);

            if (error || !outfit) {
                set({ error: error?.message || 'Failed to update outfit', isLoading: false });
                return { success: false };
            }

            // Update in list
            set(state => ({
                outfits: state.outfits.map(o => o.id === id ? outfit : o),
                currentOutfit: state.currentOutfit?.id === id ? outfit : state.currentOutfit,
                isLoading: false,
            }));

            return { success: true };
        } catch (error) {
            set({
                error: 'Failed to update outfit',
                isLoading: false,
            });
            return { success: false };
        }
    },

    // Delete outfit
    deleteOutfit: async (id) => {
        set({ isLoading: true, error: null });

        try {
            const { error } = await outfitService.deleteOutfit(id);

            if (error) {
                set({ error: error.message, isLoading: false });
                return { success: false };
            }

            // Remove from list
            set(state => ({
                outfits: state.outfits.filter(o => o.id !== id),
                currentOutfit: state.currentOutfit?.id === id ? null : state.currentOutfit,
                totalCount: state.totalCount - 1,
                isLoading: false,
            }));

            return { success: true };
        } catch (error) {
            set({
                error: 'Failed to delete outfit',
                isLoading: false,
            });
            return { success: false };
        }
    },

    // Toggle favorite
    toggleFavorite: async (id) => {
        const state = get();
        const outfit = state.outfits.find(o => o.id === id);
        if (!outfit) return { success: false };

        const newValue = !outfit.is_favorite;

        // Optimistic update
        set(state => ({
            outfits: state.outfits.map(o =>
                o.id === id ? { ...o, is_favorite: newValue } : o
            ),
            currentOutfit: state.currentOutfit?.id === id
                ? { ...state.currentOutfit, is_favorite: newValue }
                : state.currentOutfit,
        }));

        const { error } = await outfitService.toggleFavorite(id, newValue);

        if (error) {
            // Rollback on failure
            set(state => ({
                outfits: state.outfits.map(o =>
                    o.id === id ? { ...o, is_favorite: !newValue } : o
                ),
                error: error.message,
            }));
            return { success: false };
        }

        return { success: true };
    },

    // Set current outfit
    setCurrentOutfit: (outfit) => {
        set({ currentOutfit: outfit });
    },

    // Clear error
    clearError: () => {
        set({ error: null });
    },

    // Reset store
    reset: () => {
        set({
            outfits: [],
            currentOutfit: null,
            isLoading: false,
            error: null,
            hasMore: true,
            totalCount: 0,
        });
    },
}));
