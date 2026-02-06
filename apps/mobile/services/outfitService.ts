/**
 * Outfit Service
 * Handles CRUD operations for outfits
 */

import { supabase } from './supabase';
import {
    Outfit,
    OutfitItem,
    CreateOutfitInput,
    UpdateOutfitInput,
    OutfitPosition,
    validateOutfitItems,
} from '../types/outfit';

export const outfitService = {
    /**
     * Create a new outfit with items
     */
    createOutfit: async (
        input: CreateOutfitInput
    ): Promise<{ outfit: Outfit | null; error: Error | null }> => {
        try {
            // Validate items
            const validation = validateOutfitItems(input.items);
            if (!validation.valid) {
                return { outfit: null, error: new Error(validation.errors.join(', ')) };
            }

            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) {
                return { outfit: null, error: new Error('User not authenticated') };
            }

            // Create outfit
            const { data: outfit, error: outfitError } = await supabase
                .from('outfits')
                .insert({
                    user_id: userData.user.id,
                    name: input.name || null,
                    occasion: input.occasion || null,
                    is_ai_generated: input.is_ai_generated || false,
                    weather_context: input.weather_context || null,
                })
                .select()
                .single();

            if (outfitError) {
                console.error('Create outfit error:', outfitError);
                return { outfit: null, error: outfitError };
            }

            // Create outfit items
            const outfitItems = input.items.map(item => ({
                outfit_id: outfit.id,
                item_id: item.item_id,
                position: item.position,
            }));

            const { error: itemsError } = await supabase
                .from('outfit_items')
                .insert(outfitItems);

            if (itemsError) {
                console.error('Create outfit items error:', itemsError);
                // Rollback outfit creation
                await supabase.from('outfits').delete().eq('id', outfit.id);
                return { outfit: null, error: itemsError };
            }

            return { outfit: outfit as Outfit, error: null };
        } catch (error) {
            console.error('Create outfit exception:', error);
            return { outfit: null, error: error as Error };
        }
    },

    /**
     * Get all outfits for current user
     */
    getOutfits: async (options?: {
        limit?: number;
        offset?: number;
        aiGeneratedOnly?: boolean;
    }): Promise<{ outfits: Outfit[]; error: Error | null }> => {
        try {
            let query = supabase
                .from('outfits')
                .select(`
                    *,
                    items:outfit_items(
                        id,
                        outfit_id,
                        item_id,
                        position,
                        item:items(*)
                    )
                `)
                .order('created_at', { ascending: false });

            if (options?.aiGeneratedOnly) {
                query = query.eq('is_ai_generated', true);
            }

            if (options?.limit) {
                query = query.limit(options.limit);
            }

            if (options?.offset) {
                query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Get outfits error:', error);
                return { outfits: [], error };
            }

            return { outfits: data as Outfit[], error: null };
        } catch (error) {
            console.error('Get outfits exception:', error);
            return { outfits: [], error: error as Error };
        }
    },

    /**
     * Get a single outfit by ID with items
     */
    getOutfit: async (
        id: string
    ): Promise<{ outfit: Outfit | null; error: Error | null }> => {
        try {
            const { data, error } = await supabase
                .from('outfits')
                .select(`
                    *,
                    items:outfit_items(
                        id,
                        outfit_id,
                        item_id,
                        position,
                        item:items(*)
                    )
                `)
                .eq('id', id)
                .single();

            if (error) {
                console.error('Get outfit error:', error);
                return { outfit: null, error };
            }

            return { outfit: data as Outfit, error: null };
        } catch (error) {
            console.error('Get outfit exception:', error);
            return { outfit: null, error: error as Error };
        }
    },

    /**
     * Update an outfit
     */
    updateOutfit: async (
        id: string,
        input: UpdateOutfitInput
    ): Promise<{ outfit: Outfit | null; error: Error | null }> => {
        try {
            // Validate items if provided
            if (input.items) {
                const validation = validateOutfitItems(input.items);
                if (!validation.valid) {
                    return { outfit: null, error: new Error(validation.errors.join(', ')) };
                }
            }

            // Update outfit metadata
            const updateData: Record<string, unknown> = {};
            if (input.name !== undefined) updateData.name = input.name;
            if (input.occasion !== undefined) updateData.occasion = input.occasion;

            if (Object.keys(updateData).length > 0) {
                const { error: updateError } = await supabase
                    .from('outfits')
                    .update(updateData)
                    .eq('id', id);

                if (updateError) {
                    console.error('Update outfit error:', updateError);
                    return { outfit: null, error: updateError };
                }
            }

            // Update items if provided
            if (input.items) {
                // Delete existing items
                const { error: deleteError } = await supabase
                    .from('outfit_items')
                    .delete()
                    .eq('outfit_id', id);

                if (deleteError) {
                    console.error('Delete outfit items error:', deleteError);
                    return { outfit: null, error: deleteError };
                }

                // Insert new items
                const outfitItems = input.items.map(item => ({
                    outfit_id: id,
                    item_id: item.item_id,
                    position: item.position,
                }));

                const { error: insertError } = await supabase
                    .from('outfit_items')
                    .insert(outfitItems);

                if (insertError) {
                    console.error('Insert outfit items error:', insertError);
                    return { outfit: null, error: insertError };
                }
            }

            // Return updated outfit
            return outfitService.getOutfit(id);
        } catch (error) {
            console.error('Update outfit exception:', error);
            return { outfit: null, error: error as Error };
        }
    },

    /**
     * Delete an outfit
     */
    deleteOutfit: async (id: string): Promise<{ error: Error | null }> => {
        try {
            // outfit_items will be cascade deleted
            const { error } = await supabase.from('outfits').delete().eq('id', id);
            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    },

    /**
     * Toggle favorite status on an outfit
     */
    toggleFavorite: async (
        id: string,
        is_favorite: boolean
    ): Promise<{ error: Error | null }> => {
        try {
            const { error } = await supabase
                .from('outfits')
                .update({ is_favorite })
                .eq('id', id);
            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    },

    /**
     * Get outfit count for user
     */
    getOutfitCount: async (): Promise<{ count: number; error: Error | null }> => {
        try {
            const { count, error } = await supabase
                .from('outfits')
                .select('*', { count: 'exact', head: true });

            if (error) {
                return { count: 0, error };
            }

            return { count: count || 0, error: null };
        } catch (error) {
            return { count: 0, error: error as Error };
        }
    },
};
