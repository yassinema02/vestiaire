/**
 * Social Feature Types
 * Story 9.1: Style Squads Creation
 * Story 9.2: OOTD Posting Flow
 */

export interface StyleSquad {
    id: string;
    creator_id: string;
    name: string;
    description: string | null;
    invite_code: string;
    max_members: number;
    is_public: boolean;
    created_at: string;
    updated_at: string;
    member_count?: number;
}

export interface SquadMembership {
    id: string;
    squad_id: string;
    user_id: string;
    role: 'admin' | 'member';
    joined_at: string;
}

export interface SquadMember extends SquadMembership {
    display_name: string | null;
    avatar_url: string | null;
}

export interface CreateSquadInput {
    name: string;
    description?: string;
}

// Story 9.2: OOTD Posts

export interface OotdPost {
    id: string;
    user_id: string;
    squad_id: string;
    photo_url: string;
    caption: string | null;
    tagged_item_ids: string[] | null;
    reaction_count: number;
    comment_count: number;
    created_at: string;
}

export interface OotdPostWithAuthor extends OotdPost {
    author_display_name: string | null;
    author_avatar_url: string | null;
}

export interface CreateOotdPostInput {
    photo_uri: string;
    caption?: string;
    tagged_item_ids?: string[];
    squad_ids: string[];
}

// Story 9.4: Reactions & Comments

export interface OotdReaction {
    id: string;
    post_id: string;
    user_id: string;
    emoji: string;
    created_at: string;
}

export interface OotdComment {
    id: string;
    post_id: string;
    user_id: string;
    text: string;
    created_at: string;
}

export interface OotdCommentWithAuthor extends OotdComment {
    author_display_name: string | null;
    author_avatar_url: string | null;
}

// Story 9.6: OOTD Notifications
export type OotdNotificationPreference = 'all' | 'morning_only' | 'off';

// Story 9.7: OOTD Posting Reminder
export interface OotdReminderPreferences {
    enabled: boolean;
    time: string; // HH:mm format
}

// Story 9.5: Steal This Look

export interface StealMatchResult {
    originalItem: {
        id: string;
        name: string | null;
        category: string;
        color: string;
        image_url: string;
    };
    matchType: 'exact' | 'similar' | 'missing';
    matchedItem?: {
        id: string;
        name: string | null;
        category: string;
        color: string;
        image_url: string;
    };
    matchReason: string;
    confidence: number; // 0-100
}

export interface StealLookResult {
    postId: string;
    matches: StealMatchResult[];
    overallScore: number;
    canRecreate: boolean;
}
