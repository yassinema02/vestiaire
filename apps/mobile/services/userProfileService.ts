/**
 * User Profile Service
 * Profile Setup Onboarding
 * Reads/writes gender, birth_year, height/weight, style_tags to Supabase profiles table.
 */

import { supabase } from './supabase';
import { requireUserId } from './auth-helpers';
import { UserProfile, StyleOption } from '../types/userProfile';

// ─── Style options (Pinterest-style image grid) ───────────────────

export const STYLE_OPTIONS: StyleOption[] = [
    {
        id: 'minimalist',
        label: 'Minimalist',
        imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80',
        keywords: ['clean', 'neutral', 'simple', 'monochrome'],
    },
    {
        id: 'streetwear',
        label: 'Streetwear',
        imageUrl: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=400&q=80',
        keywords: ['urban', 'hoodie', 'sneakers', 'graphic tee'],
    },
    {
        id: 'business-casual',
        label: 'Business Casual',
        imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        keywords: ['smart', 'blazer', 'chinos', 'professional'],
    },
    {
        id: 'bohemian',
        label: 'Bohemian',
        imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=400&q=80',
        keywords: ['boho', 'flowy', 'earthy', 'layered', 'free-spirited'],
    },
    {
        id: 'preppy',
        label: 'Preppy',
        imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
        keywords: ['polo', 'plaid', 'loafers', 'classic', 'collegiate'],
    },
    {
        id: 'sporty',
        label: 'Sporty',
        imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=400&q=80',
        keywords: ['athletic', 'activewear', 'sneakers', 'performance'],
    },
    {
        id: 'dark-academia',
        label: 'Dark Academia',
        imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
        keywords: ['tweed', 'dark', 'vintage', 'intellectual', 'layered'],
    },
    {
        id: 'smart-casual',
        label: 'Smart Casual',
        imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80',
        keywords: ['relaxed', 'polished', 'versatile', 'everyday'],
    },
    {
        id: 'vintage',
        label: 'Vintage',
        imageUrl: 'https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=400&q=80',
        keywords: ['retro', 'thrift', '70s', '80s', '90s', 'nostalgic'],
    },
    {
        id: 'y2k',
        label: 'Y2K',
        imageUrl: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=400&q=80',
        keywords: ['2000s', 'low-rise', 'metallic', 'futuristic', 'pop'],
    },
    {
        id: 'coastal',
        label: 'Coastal',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
        keywords: ['linen', 'nautical', 'beach', 'light', 'relaxed'],
    },
    {
        id: 'formal',
        label: 'Formal',
        imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4a7e?auto=format&fit=crop&w=400&q=80',
        keywords: ['suit', 'black tie', 'elegant', 'dressy', 'evening'],
    },
];

// ─── Service ──────────────────────────────────────────────────────

export const userProfileService = {
    /**
     * Fetch the user's profile fields from Supabase.
     */
    getProfile: async (): Promise<UserProfile> => {
        const userId = await requireUserId();
        const { data, error } = await supabase
            .from('profiles')
            .select('gender, birth_year, height_cm, weight_kg, style_tags')
            .eq('id', userId)
            .single();

        if (error || !data) {
            return { style_tags: [] };
        }

        return {
            gender: data.gender ?? undefined,
            birth_year: data.birth_year ?? undefined,
            height_cm: data.height_cm ?? undefined,
            weight_kg: data.weight_kg ?? undefined,
            style_tags: data.style_tags ?? [],
        };
    },

    /**
     * Save (upsert) profile fields to Supabase.
     */
    saveProfile: async (profile: Partial<UserProfile>): Promise<void> => {
        const userId = await requireUserId();
        const { error } = await supabase
            .from('profiles')
            .update({
                gender: profile.gender ?? null,
                birth_year: profile.birth_year ?? null,
                height_cm: profile.height_cm ?? null,
                weight_kg: profile.weight_kg ?? null,
                style_tags: profile.style_tags ?? [],
            })
            .eq('id', userId);

        if (error) {
            throw new Error(`Failed to save profile: ${error.message}`);
        }
    },
};
