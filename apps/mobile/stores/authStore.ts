/**
 * Auth Store
 * Zustand store for managing authentication state
 *
 * SECURITY NOTE (audit 2026-04-05): Added translateAuthError() to prevent
 * raw Supabase error messages (which may reveal whether an email exists,
 * or leak DB details) from reaching the UI.
 */

import { create } from 'zustand';
import { authService } from '../services/auth';
import type { User, Session, AuthError } from '@supabase/supabase-js';

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

/**
 * Map raw Supabase auth errors to safe, user-facing messages.
 * Prevents account-enumeration and internal-detail leakage.
 */
function translateAuthError(error: AuthError): string {
    const msg = error.message?.toLowerCase() ?? '';
    if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
        return 'Invalid email or password';
    }
    if (msg.includes('email not confirmed')) {
        return 'Please verify your email before signing in';
    }
    if (msg.includes('user already registered') || msg.includes('already been registered')) {
        // Do NOT reveal that the email exists — generic message
        return 'Unable to create account. Please try again or sign in.';
    }
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
        return 'Too many attempts. Please wait a moment and try again.';
    }
    // Fallback — never expose the raw message
    return 'An authentication error occurred. Please try again.';
}

// Track the auth subscription so we can clean it up
let authSubscription: { unsubscribe: () => void } | null = null;

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
                console.error('Auth initialization error:', error.status);
                set({ isLoading: false, isInitialized: true, error: translateAuthError(error) });
                return;
            }

            set({
                session,
                user: session?.user ?? null,
                isLoading: false,
                isInitialized: true,
                error: null,
            });

            // Unsubscribe previous listener to prevent duplicates
            if (authSubscription) {
                authSubscription.unsubscribe();
                authSubscription = null;
            }

            // Subscribe to auth changes
            const { data } = authService.onAuthStateChange((event, newSession) => {
                // Auth event logged at debug level only (audit 2026-04-05)
                set({
                    session: newSession,
                    user: newSession?.user ?? null,
                });
            });
            authSubscription = data.subscription;
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
                set({ isLoading: false, error: translateAuthError(error) });
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
                set({ isLoading: false, error: translateAuthError(error) });
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
            // Clean up auth listener before signing out
            if (authSubscription) {
                authSubscription.unsubscribe();
                authSubscription = null;
            }
            await authService.signOut();
            set({
                user: null,
                session: null,
                isLoading: false,
                isInitialized: false,
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
                set({ isLoading: false, error: translateAuthError(error) });
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
