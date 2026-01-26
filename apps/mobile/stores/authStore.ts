/**
 * Auth Store
 * Zustand store for managing authentication state
 */

import { create } from 'zustand';
import { authService } from '../services/auth';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isInitialized: boolean;
    error: string | null;
}

interface AuthActions {
    initialize: () => Promise<void>;
    signUp: (email: string, password: string) => Promise<{ success: boolean; needsVerification: boolean }>;
    signIn: (email: string, password: string) => Promise<boolean>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<boolean>;
    clearError: () => void;
    setSession: (session: Session | null) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
    // State
    user: null,
    session: null,
    isLoading: false,
    isInitialized: false,
    error: null,

    // Actions
    initialize: async () => {
        try {
            set({ isLoading: true });
            const { session, error } = await authService.getSession();

            if (error) {
                console.error('Auth initialization error:', error.message);
                set({ isLoading: false, isInitialized: true, error: error.message });
                return;
            }

            set({
                session,
                user: session?.user ?? null,
                isLoading: false,
                isInitialized: true,
                error: null,
            });

            // Subscribe to auth changes
            authService.onAuthStateChange((event, newSession) => {
                console.log('Auth state changed:', event);
                set({
                    session: newSession,
                    user: newSession?.user ?? null,
                });
            });
        } catch (err) {
            console.error('Auth initialization failed:', err);
            set({ isLoading: false, isInitialized: true, error: 'Failed to initialize auth' });
        }
    },

    signUp: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
            const { user, session, error } = await authService.signUp(email, password);

            if (error) {
                set({ isLoading: false, error: error.message });
                return { success: false, needsVerification: false };
            }

            // If email confirmation is required, session will be null
            const needsVerification = !session && user !== null;

            set({
                user,
                session,
                isLoading: false,
                error: null,
            });

            return { success: true, needsVerification };
        } catch (err) {
            set({ isLoading: false, error: 'Sign up failed. Please try again.' });
            return { success: false, needsVerification: false };
        }
    },

    signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
            const { user, session, error } = await authService.signIn(email, password);

            if (error) {
                set({ isLoading: false, error: error.message });
                return false;
            }

            set({
                user,
                session,
                isLoading: false,
                error: null,
            });

            return true;
        } catch (err) {
            set({ isLoading: false, error: 'Sign in failed. Please try again.' });
            return false;
        }
    },

    signOut: async () => {
        set({ isLoading: true, error: null });
        try {
            await authService.signOut();
            set({
                user: null,
                session: null,
                isLoading: false,
                error: null,
            });
        } catch (err) {
            set({ isLoading: false, error: 'Sign out failed' });
        }
    },

    resetPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
            const { error } = await authService.resetPassword(email);

            if (error) {
                set({ isLoading: false, error: error.message });
                return false;
            }

            set({ isLoading: false, error: null });
            return true;
        } catch (err) {
            set({ isLoading: false, error: 'Failed to send reset email' });
            return false;
        }
    },

    clearError: () => set({ error: null }),

    setSession: (session: Session | null) => set({
        session,
        user: session?.user ?? null,
    }),
}));
