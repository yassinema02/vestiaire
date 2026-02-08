/**
 * Secure Storage Adapter for Supabase Auth
 * Phase 3: Replaces plain-text AsyncStorage with encrypted expo-secure-store.
 *
 * expo-secure-store has a ~2048 byte limit per key on some devices.
 * Supabase auth sessions (JWT + refresh token) often exceed this.
 * This adapter transparently chunks large values across multiple keys.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Max bytes per SecureStore key. The documented limit is 2048 bytes,
 * but we leave margin for JSON overhead and key name encoding.
 */
const CHUNK_SIZE = 1800;

/**
 * SecureStore options — use the most secure defaults available.
 * On iOS this stores in the Keychain; on Android in the EncryptedSharedPreferences.
 */
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * Storage adapter that implements the interface Supabase expects:
 *   getItem(key) → string | null
 *   setItem(key, value) → void
 *   removeItem(key) → void
 */
export const secureStorageAdapter = {
    async getItem(key: string): Promise<string | null> {
        try {
            // Read chunk count
            const chunkCountStr = await SecureStore.getItemAsync(
                `${key}__chunks`,
                STORE_OPTIONS
            );

            if (chunkCountStr === null) {
                // Try reading as a single (non-chunked) value for backward compat
                return await SecureStore.getItemAsync(key, STORE_OPTIONS);
            }

            const chunkCount = parseInt(chunkCountStr, 10);
            if (isNaN(chunkCount) || chunkCount <= 0) {
                return null;
            }

            // Reassemble chunks
            const chunks: string[] = [];
            for (let i = 0; i < chunkCount; i++) {
                const chunk = await SecureStore.getItemAsync(
                    `${key}__chunk_${i}`,
                    STORE_OPTIONS
                );
                if (chunk === null) {
                    // Data is corrupted/incomplete — clear and return null
                    await secureStorageAdapter.removeItem(key);
                    return null;
                }
                chunks.push(chunk);
            }

            return chunks.join('');
        } catch (error) {
            console.warn('SecureStorage getItem error:', error);
            return null;
        }
    },

    async setItem(key: string, value: string): Promise<void> {
        try {
            // First, clean up any previous value (different chunk count)
            await secureStorageAdapter.removeItem(key);

            if (value.length <= CHUNK_SIZE) {
                // Small enough to store directly (skip chunking)
                await SecureStore.setItemAsync(key, value, STORE_OPTIONS);
                // Don't write __chunks key for single values — getItem handles this
                return;
            }

            // Split into chunks
            const chunks: string[] = [];
            for (let i = 0; i < value.length; i += CHUNK_SIZE) {
                chunks.push(value.substring(i, i + CHUNK_SIZE));
            }

            // Write chunk count first
            await SecureStore.setItemAsync(
                `${key}__chunks`,
                chunks.length.toString(),
                STORE_OPTIONS
            );

            // Write each chunk
            for (let i = 0; i < chunks.length; i++) {
                await SecureStore.setItemAsync(
                    `${key}__chunk_${i}`,
                    chunks[i],
                    STORE_OPTIONS
                );
            }
        } catch (error) {
            console.warn('SecureStorage setItem error:', error);
        }
    },

    async removeItem(key: string): Promise<void> {
        try {
            // Read chunk count to know how many to delete
            const chunkCountStr = await SecureStore.getItemAsync(
                `${key}__chunks`,
                STORE_OPTIONS
            );

            if (chunkCountStr !== null) {
                const chunkCount = parseInt(chunkCountStr, 10);
                if (!isNaN(chunkCount)) {
                    for (let i = 0; i < chunkCount; i++) {
                        await SecureStore.deleteItemAsync(
                            `${key}__chunk_${i}`,
                            STORE_OPTIONS
                        );
                    }
                }
                await SecureStore.deleteItemAsync(`${key}__chunks`, STORE_OPTIONS);
            }

            // Also delete the single-value key (backward compat / small values)
            await SecureStore.deleteItemAsync(key, STORE_OPTIONS);
        } catch (error) {
            // Ignore errors during cleanup — key may not exist
        }
    },
};
