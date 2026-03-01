/**
 * Items Service
 * Handles CRUD operations for wardrobe items
 */

import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';

export interface WardrobeItem {
    id: string;
    user_id: string;
    image_url: string;
    original_image_url?: string;
    processed_image_url?: string;
    name?: string;
    brand?: string;
    category?: string;
    sub_category?: string;
    colors?: string[];
    seasons?: string[];
    occasions?: string[];
    purchase_price?: number;
    purchase_date?: string;
    wear_count: number;
    last_worn_at?: string;
    is_favorite: boolean;
    status: 'pending' | 'processing' | 'complete';
    created_at: string;
    updated_at: string;
    // Extraction metadata (Story 10.5)
    creation_method?: string;
    extraction_source?: string;
    extraction_job_id?: string;
    ai_confidence?: number;
    // Neglect detection (Story 13.1)
    neglect_status?: boolean;
    // Resale status (Story 13.3)
    resale_status?: 'listed' | 'sold' | 'donated' | null;
}

export interface CreateItemInput {
    image_url: string;
    original_image_url?: string;
    name?: string;
    brand?: string;
    category?: string;
    sub_category?: string;
    colors?: string[];
    seasons?: string[];
    occasions?: string[];
    purchase_price?: number;
    purchase_date?: string;
    // Extraction metadata (Story 10.5)
    creation_method?: 'manual' | 'ai_extraction' | 'screenshot_import';
    extraction_source?: string;
    extraction_job_id?: string;
    ai_confidence?: number;
}

export const itemsService = {
    /**
     * Create a new wardrobe item
     */
    createItem: async (
        input: CreateItemInput
    ): Promise<{ item: WardrobeItem | null; error: Error | null }> => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                return { item: null, error: new Error('User not authenticated') };
            }

            const insertData: Record<string, any> = {
                    user_id: userData.user.id,
                    image_url: input.image_url,
                    original_image_url: input.original_image_url || input.image_url,
                    name: input.name,
                    brand: input.brand,
                    category: input.category,
                    sub_category: input.sub_category,
                    colors: input.colors,
                    seasons: input.seasons,
                    occasions: input.occasions,
                    purchase_price: input.purchase_price,
                    purchase_date: input.purchase_date,
                    status: 'pending',
                };

            // Add extraction metadata if present
            if (input.creation_method) insertData.creation_method = input.creation_method;
            if (input.extraction_source) insertData.extraction_source = input.extraction_source;
            if (input.extraction_job_id) insertData.extraction_job_id = input.extraction_job_id;
            if (input.ai_confidence != null) insertData.ai_confidence = input.ai_confidence;

            const { data, error } = await supabase
                .from('items')
                .insert(insertData)
                .select()
                .single();

            if (error) {
                console.error('Create item error:', error);
                return { item: null, error };
            }

            return { item: data as WardrobeItem, error: null };
        } catch (error) {
            console.error('Create item exception:', error);
            return { item: null, error: error as Error };
        }
    },

    /**
     * Get all items for current user
     */
    getItems: async (): Promise<{ items: WardrobeItem[]; error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const { data, error } = await supabase
                .from('items')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Get items error:', error);
                return { items: [], error };
            }

            return { items: data as WardrobeItem[], error: null };
        } catch (error) {
            console.error('Get items exception:', error);
            return { items: [], error: error as Error };
        }
    },

    /**
     * Get a single item by ID
     */
    getItem: async (
        id: string
    ): Promise<{ item: WardrobeItem | null; error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const { data, error } = await supabase
                .from('items')
                .select('*')
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            if (error) {
                console.error('Get item error:', error);
                return { item: null, error };
            }

            return { item: data as WardrobeItem, error: null };
        } catch (error) {
            console.error('Get item exception:', error);
            return { item: null, error: error as Error };
        }
    },

    /**
     * Update an item
     */
    updateItem: async (
        id: string,
        updates: Partial<CreateItemInput>
    ): Promise<{ item: WardrobeItem | null; error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const { data, error } = await supabase
                .from('items')
                .update(updates)
                .eq('id', id)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) {
                console.error('Update item error:', error);
                return { item: null, error };
            }

            return { item: data as WardrobeItem, error: null };
        } catch (error) {
            console.error('Update item exception:', error);
            return { item: null, error: error as Error };
        }
    },

    /**
     * Delete an item
     */
    deleteItem: async (id: string): Promise<{ error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const { error } = await supabase.from('items').delete().eq('id', id).eq('user_id', userId);
            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    },

    /**
     * Toggle favorite status
     */
    toggleFavorite: async (
        id: string,
        isFavorite: boolean
    ): Promise<{ error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const { error } = await supabase
                .from('items')
                .update({ is_favorite: isFavorite })
                .eq('id', id)
                .eq('user_id', userId);
            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    },

    /**
     * Increment wear count (atomic — no read-modify-write race)
     */
    incrementWearCount: async (id: string): Promise<{ error: Error | null }> => {
        try {
            const userId = await requireUserId();
            const { error } = await supabase.rpc('increment_wear_count', {
                p_item_id: id,
                p_user_id: userId,
            });

            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    },
};
