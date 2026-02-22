/**
 * Engagement Service
 * Handles reactions and comments on OOTD posts.
 * Story 9.4: Reactions & Comments
 */

import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';
import { OotdCommentWithAuthor } from '../types/social';

export const engagementService = {
    /**
     * Toggle reaction on a post. Inserts if not reacted, deletes if already reacted.
     */
    async toggleReaction(postId: string): Promise<{ reacted: boolean; error: Error | null }> {
        try {
            const userId = await requireUserId();

            const { data: existing } = await supabase
                .from('ootd_reactions')
                .select('id')
                .eq('post_id', postId)
                .eq('user_id', userId)
                .maybeSingle();

            if (existing) {
                const { error } = await supabase
                    .from('ootd_reactions')
                    .delete()
                    .eq('id', existing.id);
                if (error) return { reacted: true, error };
                return { reacted: false, error: null };
            } else {
                const { error } = await supabase
                    .from('ootd_reactions')
                    .insert({ post_id: postId, user_id: userId });
                if (error) return { reacted: false, error };
                return { reacted: true, error: null };
            }
        } catch (error) {
            return { reacted: false, error: error as Error };
        }
    },

    /**
     * Batch check which posts the current user has reacted to.
     */
    async getUserReactions(postIds: string[]): Promise<Record<string, boolean>> {
        const map: Record<string, boolean> = {};
        postIds.forEach((id) => (map[id] = false));

        if (postIds.length === 0) return map;

        try {
            const userId = await requireUserId();
            const { data } = await supabase
                .from('ootd_reactions')
                .select('post_id')
                .eq('user_id', userId)
                .in('post_id', postIds);

            data?.forEach((r) => (map[r.post_id] = true));
        } catch {
            // Return all false on error
        }

        return map;
    },

    /**
     * Get comments for a post with author profile data.
     */
    async getPostComments(
        postId: string,
        limit: number = 50
    ): Promise<{ comments: OotdCommentWithAuthor[]; error: Error | null }> {
        try {
            const { data, error } = await supabase
                .from('ootd_comments')
                .select(`
                    *,
                    profiles:user_id (display_name, avatar_url)
                `)
                .eq('post_id', postId)
                .order('created_at', { ascending: true })
                .limit(limit);

            if (error) return { comments: [], error };

            const comments: OotdCommentWithAuthor[] = (data || []).map((row: any) => ({
                id: row.id,
                post_id: row.post_id,
                user_id: row.user_id,
                text: row.text,
                created_at: row.created_at,
                author_display_name: row.profiles?.display_name || null,
                author_avatar_url: row.profiles?.avatar_url || null,
            }));

            return { comments, error: null };
        } catch (error) {
            return { comments: [], error: error as Error };
        }
    },

    /**
     * Add a comment to a post.
     */
    async addComment(
        postId: string,
        text: string
    ): Promise<{ comment: OotdCommentWithAuthor | null; error: Error | null }> {
        try {
            const userId = await requireUserId();
            const trimmed = text.trim();

            if (trimmed.length === 0 || trimmed.length > 200) {
                return { comment: null, error: new Error('Comment must be 1-200 characters') };
            }

            const { data, error } = await supabase
                .from('ootd_comments')
                .insert({ post_id: postId, user_id: userId, text: trimmed })
                .select(`
                    *,
                    profiles:user_id (display_name, avatar_url)
                `)
                .single();

            if (error) return { comment: null, error };

            const comment: OotdCommentWithAuthor = {
                id: data.id,
                post_id: data.post_id,
                user_id: data.user_id,
                text: data.text,
                created_at: data.created_at,
                author_display_name: (data as any).profiles?.display_name || null,
                author_avatar_url: (data as any).profiles?.avatar_url || null,
            };

            return { comment, error: null };
        } catch (error) {
            return { comment: null, error: error as Error };
        }
    },

    /**
     * Delete a comment. RLS handles authorization (own comment or post author).
     */
    async deleteComment(commentId: string): Promise<{ error: Error | null }> {
        try {
            const { error } = await supabase
                .from('ootd_comments')
                .delete()
                .eq('id', commentId);

            return { error: error || null };
        } catch (error) {
            return { error: error as Error };
        }
    },
};
