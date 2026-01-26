/**
 * Auth Service
 * Handles all authentication operations with Supabase
 */

import { supabase } from './supabase';
import type { AuthError, User, Session } from '@supabase/supabase-js';

export interface AuthResponse {
    user: User | null;
    session: Session | null;
    error: AuthError | null;
}

export interface AuthErrorResponse {
    error: AuthError | null;
}

export const authService = {
    /**
     * Sign up a new user with email and password
     */
    signUp: async (email: string, password: string): Promise<AuthResponse> => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        return {
            user: data.user,
            session: data.session,
            error,
        };
    },

    /**
     * Sign in with email and password
     */
    signIn: async (email: string, password: string): Promise<AuthResponse> => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return {
            user: data.user,
            session: data.session,
            error,
        };
    },

    /**
     * Sign out the current user
     */
    signOut: async (): Promise<AuthErrorResponse> => {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    /**
     * Send password reset email
     */
    resetPassword: async (email: string): Promise<AuthErrorResponse> => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'vestiaire://reset-password',
        });
        return { error };
    },

    /**
     * Get current session
     */
    getSession: async (): Promise<{ session: Session | null; error: AuthError | null }> => {
        const { data, error } = await supabase.auth.getSession();
        return { session: data.session, error };
    },

    /**
     * Get current user
     */
    getUser: async (): Promise<{ user: User | null; error: AuthError | null }> => {
        const { data, error } = await supabase.auth.getUser();
        return { user: data.user, error };
    },

    /**
     * Resend verification email
     */
    resendVerificationEmail: async (email: string): Promise<AuthErrorResponse> => {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
        });
        return { error };
    },

    /**
     * Subscribe to auth state changes
     */
    onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
        return supabase.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    },
};
