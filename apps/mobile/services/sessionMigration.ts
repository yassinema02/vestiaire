/**
 * Session Storage Migration
 * One-time migration from plain-text AsyncStorage to encrypted SecureStore.
 *
 * On first launch after this update, any existing Supabase session stored
 * in AsyncStorage is moved to SecureStore, then the AsyncStorage copy is
 * deleted. A flag prevents re-running on subsequent launches.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorageAdapter } from './secureStorage';

const MIGRATION_FLAG = '@vestiaire/session_migrated_v1';

/**
 * The Supabase JS client uses a key derived from the project ref.
 * Format: sb-<project-ref>-auth-token
 */
const SUPABASE_SESSION_KEY = 'sb-ynldmugsihrgwpvuvofu-auth-token';

/**
 * Migrate Supabase auth session from AsyncStorage → SecureStore.
 * Safe to call on every app launch — returns immediately if already migrated.
 */
export async function migrateSessionStorage(): Promise<void> {
    try {
        // Check if already migrated
        const alreadyMigrated = await AsyncStorage.getItem(MIGRATION_FLAG);
        if (alreadyMigrated === 'true') return;

        // Read existing session from AsyncStorage
        const existingSession = await AsyncStorage.getItem(SUPABASE_SESSION_KEY);

        if (existingSession) {
            // Write to SecureStore
            await secureStorageAdapter.setItem(SUPABASE_SESSION_KEY, existingSession);

            // Verify the migration worked before deleting
            const verification = await secureStorageAdapter.getItem(SUPABASE_SESSION_KEY);
            if (verification === existingSession) {
                // Remove from AsyncStorage
                await AsyncStorage.removeItem(SUPABASE_SESSION_KEY);
            } else {
                // Migration failed silently — user will need to re-login
                console.warn('Session migration verification failed — user may need to re-login');
            }
        }

        // Mark as migrated (even if there was no session to migrate)
        await AsyncStorage.setItem(MIGRATION_FLAG, 'true');
    } catch (error) {
        // Don't crash the app if migration fails — worst case user re-logs in
        console.warn('Session migration error:', error);
        // Still mark as attempted to avoid retrying endlessly
        try {
            await AsyncStorage.setItem(MIGRATION_FLAG, 'true');
        } catch {}
    }
}
