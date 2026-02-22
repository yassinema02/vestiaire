/**
 * Social Store
 * Manages Style Squads and OOTD state.
 * Story 9.1: Style Squads Creation
 * Story 9.2: OOTD Posting Flow
 * Story 9.4: Reactions & Comments
 */

import { create } from 'zustand';
import { StyleSquad, SquadMember, CreateSquadInput, OotdPostWithAuthor, CreateOotdPostInput, OotdCommentWithAuthor, StealLookResult } from '../types/social';
import { squadService } from '../services/squadService';
import { ootdService } from '../services/ootdService';
import { engagementService } from '../services/engagementService';
import { stealLookService } from '../services/stealLookService';

interface SocialState {
    squads: StyleSquad[];
    activeSquad: StyleSquad | null;
    members: SquadMember[];
    isLoading: boolean;
    // OOTD
    feedPosts: OotdPostWithAuthor[];
    isPostingOotd: boolean;
    isFeedLoading: boolean;
    activeFilter: string | null; // squad ID or null for all
    // Engagement (Story 9.4)
    postReactions: Record<string, boolean>; // user's reaction state per post
    postComments: Record<string, OotdCommentWithAuthor[]>;
    // Steal This Look (Story 9.5)
    stealLookResult: StealLookResult | null;
    isAnalyzingLook: boolean;
}

interface SocialActions {
    loadMySquads: () => Promise<void>;
    createSquad: (input: CreateSquadInput) => Promise<{ squad: StyleSquad | null; error: string | null }>;
    joinSquad: (code: string) => Promise<{ squad: StyleSquad | null; error: string | null }>;
    setActiveSquad: (squad: StyleSquad | null) => void;
    loadMembers: (squadId: string) => Promise<void>;
    removeMember: (squadId: string, userId: string) => Promise<{ error: string | null }>;
    leaveSquad: (squadId: string) => Promise<{ error: string | null }>;
    deleteSquad: (squadId: string) => Promise<{ error: string | null }>;
    // OOTD
    createOotdPost: (input: CreateOotdPostInput) => Promise<{ error: string | null }>;
    loadFeed: (squadId?: string) => Promise<void>;
    deleteOotdPost: (postId: string) => Promise<{ error: string | null }>;
    setFeedFilter: (squadId: string | null) => void;
    // Engagement (Story 9.4)
    loadReactionStates: (postIds: string[]) => Promise<void>;
    toggleReaction: (postId: string) => Promise<void>;
    loadComments: (postId: string) => Promise<void>;
    addComment: (postId: string, text: string) => Promise<{ error: string | null }>;
    deleteComment: (postId: string, commentId: string) => Promise<{ error: string | null }>;
    // Steal This Look (Story 9.5)
    analyzeLook: (post: OotdPostWithAuthor) => Promise<{ error: string | null }>;
    clearStealLook: () => void;
}

type SocialStore = SocialState & SocialActions;

export const useSocialStore = create<SocialStore>((set, get) => ({
    squads: [],
    activeSquad: null,
    members: [],
    isLoading: false,
    feedPosts: [],
    isPostingOotd: false,
    isFeedLoading: false,
    activeFilter: null,
    postReactions: {},
    postComments: {},
    stealLookResult: null,
    isAnalyzingLook: false,

    loadMySquads: async () => {
        set({ isLoading: true });
        const { squads, error } = await squadService.getMySquads();
        if (!error) {
            set({ squads });
        }
        set({ isLoading: false });
    },

    createSquad: async (input: CreateSquadInput) => {
        const { squad, error } = await squadService.createSquad(input);
        if (error) return { squad: null, error: error.message };

        if (squad) {
            set((state) => ({ squads: [squad, ...state.squads] }));
        }
        return { squad, error: null };
    },

    joinSquad: async (code: string) => {
        const { squad, error } = await squadService.joinSquadByCode(code);
        if (error) return { squad: null, error };

        if (squad) {
            // Reload squads to get accurate member counts
            const { squads } = await squadService.getMySquads();
            set({ squads });
        }
        return { squad, error: null };
    },

    setActiveSquad: (squad: StyleSquad | null) => {
        set({ activeSquad: squad, members: [] });
    },

    loadMembers: async (squadId: string) => {
        const { members, error } = await squadService.getSquadMembers(squadId);
        if (!error) {
            set({ members });
        }
    },

    removeMember: async (squadId: string, userId: string) => {
        const { error } = await squadService.removeMember(squadId, userId);
        if (error) return { error: error.message };

        // Remove from local state
        set((state) => ({
            members: state.members.filter((m) => m.user_id !== userId),
        }));
        return { error: null };
    },

    leaveSquad: async (squadId: string) => {
        const { error } = await squadService.leaveSquad(squadId);
        if (error) return { error };

        set((state) => ({
            squads: state.squads.filter((s) => s.id !== squadId),
            activeSquad: state.activeSquad?.id === squadId ? null : state.activeSquad,
        }));
        return { error: null };
    },

    deleteSquad: async (squadId: string) => {
        const { error } = await squadService.deleteSquad(squadId);
        if (error) return { error: error.message };

        set((state) => ({
            squads: state.squads.filter((s) => s.id !== squadId),
            activeSquad: state.activeSquad?.id === squadId ? null : state.activeSquad,
        }));
        return { error: null };
    },

    // OOTD Actions

    createOotdPost: async (input: CreateOotdPostInput) => {
        set({ isPostingOotd: true });
        const { posts, error } = await ootdService.createPost(input);
        set({ isPostingOotd: false });

        if (error) return { error: error.message };

        // Add new posts to feed (optimistic)
        if (posts.length > 0) {
            const postsWithAuthor: OotdPostWithAuthor[] = posts.map((p) => ({
                ...p,
                author_display_name: null,
                author_avatar_url: null,
            }));
            set((state) => ({
                feedPosts: [...postsWithAuthor, ...state.feedPosts],
            }));
        }

        return { error: null };
    },

    loadFeed: async (squadId?: string) => {
        set({ isFeedLoading: true });
        const result = squadId
            ? await ootdService.getSquadFeed(squadId)
            : await ootdService.getMyFeed();

        if (!result.error) {
            set({ feedPosts: result.posts });
        }
        set({ isFeedLoading: false });
    },

    setFeedFilter: (squadId: string | null) => {
        set({ activeFilter: squadId });
        get().loadFeed(squadId || undefined);
    },

    deleteOotdPost: async (postId: string) => {
        const { error } = await ootdService.deletePost(postId);
        if (error) return { error: error.message };

        set((state) => ({
            feedPosts: state.feedPosts.filter((p) => p.id !== postId),
        }));
        return { error: null };
    },

    // Engagement Actions (Story 9.4)

    loadReactionStates: async (postIds: string[]) => {
        const reactions = await engagementService.getUserReactions(postIds);
        set((state) => ({
            postReactions: { ...state.postReactions, ...reactions },
        }));
    },

    toggleReaction: async (postId: string) => {
        const currentState = get().postReactions[postId] || false;
        const delta = currentState ? -1 : 1;

        // Optimistic update
        set((state) => ({
            postReactions: { ...state.postReactions, [postId]: !currentState },
            feedPosts: state.feedPosts.map((p) =>
                p.id === postId
                    ? { ...p, reaction_count: Math.max(0, p.reaction_count + delta) }
                    : p
            ),
        }));

        const { error } = await engagementService.toggleReaction(postId);
        if (error) {
            // Revert on error
            set((state) => ({
                postReactions: { ...state.postReactions, [postId]: currentState },
                feedPosts: state.feedPosts.map((p) =>
                    p.id === postId
                        ? { ...p, reaction_count: Math.max(0, p.reaction_count - delta) }
                        : p
                ),
            }));
        }
    },

    loadComments: async (postId: string) => {
        const { comments } = await engagementService.getPostComments(postId);
        set((state) => ({
            postComments: { ...state.postComments, [postId]: comments },
        }));
    },

    addComment: async (postId: string, text: string) => {
        const { comment, error } = await engagementService.addComment(postId, text);
        if (error || !comment) return { error: error?.message || 'Failed to add comment' };

        // Add comment to local state and increment count
        set((state) => ({
            postComments: {
                ...state.postComments,
                [postId]: [...(state.postComments[postId] || []), comment],
            },
            feedPosts: state.feedPosts.map((p) =>
                p.id === postId
                    ? { ...p, comment_count: p.comment_count + 1 }
                    : p
            ),
        }));
        return { error: null };
    },

    deleteComment: async (postId: string, commentId: string) => {
        const { error } = await engagementService.deleteComment(commentId);
        if (error) return { error: error.message };

        set((state) => ({
            postComments: {
                ...state.postComments,
                [postId]: (state.postComments[postId] || []).filter((c) => c.id !== commentId),
            },
            feedPosts: state.feedPosts.map((p) =>
                p.id === postId
                    ? { ...p, comment_count: Math.max(0, p.comment_count - 1) }
                    : p
            ),
        }));
        return { error: null };
    },

    // Steal This Look Actions (Story 9.5)

    analyzeLook: async (post: OotdPostWithAuthor) => {
        set({ isAnalyzingLook: true, stealLookResult: null });
        const { result, error } = await stealLookService.analyzeLook(post);
        set({ isAnalyzingLook: false, stealLookResult: result });
        return { error };
    },

    clearStealLook: () => {
        set({ stealLookResult: null, isAnalyzingLook: false });
    },
}));
