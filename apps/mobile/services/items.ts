/**
 * Items Service
 * Handles CRUD operations for wardrobe items
 */

import { supabase } from './supabase';

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

            const { data, error } = await supabase
                .from('items')
                .insert({
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
                })
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
            const { data, error } = await supabase
                .from('items')
                .select('*')
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
            const { data, error } = await supabase
                .from('items')
                .select('*')
                .eq('id', id)
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
            const { data, error } = await supabase
                .from('items')
                .update(updates)
                .eq('id', id)
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
            const { error } = await supabase.from('items').delete().eq('id', id);
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
            const { error } = await supabase
                .from('items')
                .update({ is_favorite: isFavorite })
                .eq('id', id);
            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    },

    /**
     * Increment wear count
     */
    incrementWearCount: async (id: string): Promise<{ error: Error | null }> => {
        try {
            // Get current count
            const { data: item } = await supabase
                .from('items')
                .select('wear_count')
                .eq('id', id)
                .single();

            const currentCount = item?.wear_count || 0;

            const { error } = await supabase
                .from('items')
                .update({
                    wear_count: currentCount + 1,
                    last_worn_at: new Date().toISOString(),
                })
                .eq('id', id);

            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    },
};
