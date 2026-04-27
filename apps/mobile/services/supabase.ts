/**
 * Supabase Client Configuration
 * 
 * This module initializes the Supabase client for the React Native app
 * with secure token storage using expo-secure-store.
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { secureStorageAdapter } from './secureStorage';
import { runtimeConfig } from './runtimeConfig';

// Get environment variables from Expo config
const supabaseUrl = runtimeConfig.supabaseUrl;
const supabaseAnonKey = runtimeConfig.supabaseAnonKey;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        'Missing Supabase environment variables. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.'
    );
}

/**
 * Supabase client instance
 * Use this throughout the app for database, auth, and storage operations
 */
export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
        auth: {
            storage: secureStorageAdapter,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
    }
);

/**
 * Helper to check if Supabase is properly configured
 */
export const isSupabaseConfigured = (): boolean => {
    return Boolean(supabaseUrl && supabaseAnonKey);
};
