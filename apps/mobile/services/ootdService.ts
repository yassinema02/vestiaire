/**
 * OOTD Service
 * Handles OOTD post creation, photo upload, and feed queries.
 * Story 9.2: OOTD Posting Flow
 */

import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';
import { OotdPost, OotdPostWithAuthor, CreateOotdPostInput } from '../types/social';

const BUCKET_NAME = 'ootd-photos';

export const ootdService = {
    /**
     * Upload an OOTD photo to the ootd-photos bucket.
     * Follows the same pattern as storageService.uploadImage.
     */
    async uploadOotdPhoto(
        userId: string,
        imageUri: string
    ): Promise<{ url: string | null; path: string | null; error: Error | null }> {
        try {
            const timestamp = Date.now();
            const filename = `${userId}/${timestamp}.jpg`;

            const response = await fetch(imageUri);
            const blob = await response.blob();
            const arrayBuffer = await new Response(blob).arrayBuffer();

            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filename, arrayBuffer, {
                    contentType: 'image/jpeg',
                    upsert: false,
                });

            if (error) {
                return { url: null, path: null, error };
            }

            const { data: urlData } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(data.path);

            return { url: urlData.publicUrl, path: data.path, error: null };
        } catch (error) {
            return { url: null, path: null, error: error as Error };
        }
    },

    /**
     * Create OOTD post(s). Uploads photo once, inserts one row per selected squad.
     */
    async createPost(
        input: CreateOotdPostInput
    ): Promise<{ posts: OotdPost[]; error: Error | null }> {
        try {
            const userId = await requireUserId();

            // 1. Upload photo once
            const { url: photoUrl, path: photoPath, error: uploadError } =
                await this.uploadOotdPhoto(userId, input.photo_uri);

            if (uploadError || !photoUrl) {
                return { posts: [], error: uploadError || new Error('Photo upload failed') };
            }

            // 2. Insert one row per squad
            const posts: OotdPost[] = [];
            for (const squadId of input.squad_ids) {
                const { data, error } = await supabase
                    .from('ootd_posts')
                    .insert({
                        user_id: userId,
                        squad_id: squadId,
                        photo_url: photoUrl,
                        caption: input.caption?.trim() || null,
                        tagged_item_ids: input.tagged_item_ids || [],
                    })
                    .select()
                    .single();

                if (error) {
                    console.error(`Failed to post to squad ${squadId}:`, error.message);
                    continue;
                }
                if (data) posts.push(data);
            }

            if (posts.length === 0) {
                // All inserts failed — clean up the uploaded photo
                if (photoPath) {
                    await supabase.storage.from(BUCKET_NAME).remove([photoPath]);
                }
                return { posts: [], error: new Error('Failed to create any posts') };
            }

            return { posts, error: null };
        } catch (error) {
            return { posts: [], error: error as Error };
        }
    },

    /**
     * Get posts for a specific squad feed, with author profile data.
     */
    async getSquadFeed(
        squadId: string,
        limit: number = 20
    ): Promise<{ posts: OotdPostWithAuthor[]; error: Error | null }> {
        try {
            const { data, error } = await supabase
                .from('ootd_posts')
                .select(`
                    *,
                    profiles:user_id (display_name, avatar_url)
                `)
                .eq('squad_id', squadId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) return { posts: [], error };

            const posts: OotdPostWithAuthor[] = (data || []).map((row: any) => ({
                id: row.id,
                user_id: row.user_id,
                squad_id: row.squad_id,
                photo_url: row.photo_url,
                caption: row.caption,
                tagged_item_ids: row.tagged_item_ids,
                reaction_count: row.reaction_count,
                comment_count: row.comment_count,
                created_at: row.created_at,
                author_display_name: row.profiles?.display_name || null,
                author_avatar_url: row.profiles?.avatar_url || null,
            }));

            return { posts, error: null };
        } catch (error) {
            return { posts: [], error: error as Error };
        }
    },

    /**
     * Get posts from all squads the user belongs to.
     */
    async getMyFeed(
        limit: number = 30
    ): Promise<{ posts: OotdPostWithAuthor[]; error: Error | null }> {
        try {
            const userId = await requireUserId();

            // Get all squad IDs user belongs to
            const { data: memberships, error: memError } = await supabase
                .from('squad_memberships')
                .select('squad_id')
                .eq('user_id', userId);

            if (memError || !memberships?.length) {
                return { posts: [], error: memError || null };
            }

            const squadIds = memberships.map((m) => m.squad_id);

            const { data, error } = await supabase
                .from('ootd_posts')
                .select(`
                    *,
                    profiles:user_id (display_name, avatar_url)
                `)
                .in('squad_id', squadIds)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) return { posts: [], error };

            const posts: OotdPostWithAuthor[] = (data || []).map((row: any) => ({
                id: row.id,
                user_id: row.user_id,
                squad_id: row.squad_id,
                photo_url: row.photo_url,
                caption: row.caption,
                tagged_item_ids: row.tagged_item_ids,
                reaction_count: row.reaction_count,
                comment_count: row.comment_count,
                created_at: row.created_at,
                author_display_name: row.profiles?.display_name || null,
                author_avatar_url: row.profiles?.avatar_url || null,
            }));

            return { posts, error: null };
        } catch (error) {
            return { posts: [], error: error as Error };
        }
    },

    /**
     * Fetch items by their IDs (for displaying tagged items on posts).
     */
    async getItemsByIds(
        ids: string[]
    ): Promise<{ items: Array<{ id: string; name: string | null; category: string | null; image_url: string; processed_image_url: string | null }>; error: Error | null }> {
        try {
            if (!ids || ids.length === 0) return { items: [], error: null };

            const { data, error } = await supabase
                .from('items')
                .select('id, name, category, image_url, processed_image_url')
                .in('id', ids);

            if (error) return { items: [], error };
            return { items: data || [], error: null };
        } catch (error) {
            return { items: [], error: error as Error };
        }
    },

    /**
     * Delete an OOTD post and its photo from storage.
     */
    async deletePost(postId: string): Promise<{ error: Error | null }> {
        try {
            const userId = await requireUserId();

            // Get the post to find the photo path
            const { data: post, error: fetchError } = await supabase
                .from('ootd_posts')
                .select('photo_url, user_id')
                .eq('id', postId)
                .single();

            if (fetchError || !post) {
                return { error: fetchError || new Error('Post not found') };
            }

            if (post.user_id !== userId) {
                return { error: new Error('Cannot delete another user\'s post') };
            }

            // Delete the DB row
            const { error: deleteError } = await supabase
                .from('ootd_posts')
                .delete()
                .eq('id', postId);

            if (deleteError) return { error: deleteError };

            // Try to clean up storage (best-effort, don't fail if this errors)
            try {
                const url = new URL(post.photo_url);
                const pathParts = url.pathname.split(`/${BUCKET_NAME}/`);
                if (pathParts[1]) {
                    await supabase.storage.from(BUCKET_NAME).remove([pathParts[1]]);
                }
            } catch {
                // Storage cleanup is best-effort
            }

            return { error: null };
        } catch (error) {
            return { error: error as Error };
        }
    },
};
