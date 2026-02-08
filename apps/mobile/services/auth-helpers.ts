/**
 * Auth Helpers
 * Shared utilities for authenticated Supabase queries.
 */

import { supabase } from './supabase';

/**
 * Returns the authenticated user's ID or throws if not authenticated.
 * Use this in every service function that queries user-scoped data.
 */
export async function requireUserId(): Promise<string> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return user.id;
}
