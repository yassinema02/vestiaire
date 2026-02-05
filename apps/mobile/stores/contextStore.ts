/**
 * Context Store
 * Zustand store for managing outfit context (session-only, not persisted)
 */

import { create } from 'zustand';
import { OutfitContext } from '../types/context';
import { contextService } from '../services/contextService';

interface ContextState {
    context: OutfitContext | null;
    lastRefreshed: number | null;
    isRefreshing: boolean;
}

interface ContextActions {
    refreshContext: () => void;
    getContextForAI: () => OutfitContext | null;
    getFormattedContext: () => string;
    clearContext: () => void;
}

type ContextStore = ContextState & ContextActions;

export const useContextStore = create<ContextStore>((set, get) => ({
    // State (session-only, not persisted)
    context: null,
    lastRefreshed: null,
    isRefreshing: false,

    // Actions
    refreshContext: () => {
        set({ isRefreshing: true });

        try {
            const context = contextService.buildCurrentContext();
            set({
                context,
                lastRefreshed: Date.now(),
                isRefreshing: false,
            });
        } catch (error) {
            console.error('Error refreshing context:', error);
            set({ isRefreshing: false });
        }
    },

    getContextForAI: () => {
        const state = get();

        // Refresh if no context exists
        if (!state.context) {
            get().refreshContext();
        }

        return get().context;
    },

    getFormattedContext: () => {
        const context = get().context;
        if (!context) {
            get().refreshContext();
            const freshContext = get().context;
            return freshContext
                ? contextService.formatContextForPrompt(freshContext)
                : 'Context not available';
        }
        return contextService.formatContextForPrompt(context);
    },

    clearContext: () => {
        set({
            context: null,
            lastRefreshed: null,
        });
    },
}));
