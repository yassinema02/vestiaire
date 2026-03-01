/**
 * Badge Definitions
 * Story 6.4: Badges & Achievements
 */

export type BadgeCategory = 'upload' | 'engagement' | 'sustainability' | 'secret' | 'challenge';

export interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    category: BadgeCategory;
    iconName: string; // Ionicons name
    hint: string; // Shown when locked
}

export const BADGES: BadgeDefinition[] = [
    // Upload badges
    {
        id: 'first_step',
        name: 'First Step',
        description: 'Upload your first item',
        category: 'upload',
        iconName: 'footsteps',
        hint: 'Upload your first item',
    },
    {
        id: 'closet_complete',
        name: 'Closet Complete',
        description: 'Upload 50 items to your wardrobe',
        category: 'upload',
        iconName: 'file-tray-full',
        hint: 'Keep adding items...',
    },
    {
        id: 'style_guru',
        name: 'Style Guru',
        description: 'Upload 100 items to your wardrobe',
        category: 'upload',
        iconName: 'diamond',
        hint: 'A true collection awaits...',
    },

    // Engagement badges
    {
        id: 'week_warrior',
        name: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        category: 'engagement',
        iconName: 'flame',
        hint: 'Stay active for a full week',
    },
    {
        id: 'streak_legend',
        name: 'Streak Legend',
        description: 'Maintain a 30-day streak',
        category: 'engagement',
        iconName: 'trophy',
        hint: 'Commitment is key...',
    },
    {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Log an outfit before 8 AM',
        category: 'engagement',
        iconName: 'sunny',
        hint: 'The early bird gets the badge',
    },

    // Sustainability badges
    {
        id: 'rewear_champion',
        name: 'Rewear Champion',
        description: 'Wear the same item 10+ times',
        category: 'sustainability',
        iconName: 'repeat',
        hint: 'Rewear your favorites',
    },
    {
        id: 'circular_seller',
        name: 'Circular Seller',
        description: 'Create your first resale listing',
        category: 'sustainability',
        iconName: 'pricetag',
        hint: 'Give your clothes a second life',
    },
    {
        id: 'circular_champion',
        name: 'Circular Champion',
        description: 'Sell 10 or more items through resale',
        category: 'sustainability',
        iconName: 'trophy',
        hint: 'Keep selling to earn this badge',
    },
    {
        id: 'generous_giver',
        name: 'Generous Giver',
        description: 'Donate 20 or more items',
        category: 'sustainability',
        iconName: 'heart',
        hint: 'Give your clothes to those in need',
    },

    // Secret badges
    {
        id: 'monochrome_master',
        name: 'Monochrome Master',
        description: 'Log an all-black outfit',
        category: 'secret',
        iconName: 'moon',
        hint: '??? - Embrace the dark side',
    },
    {
        id: 'rainbow_warrior',
        name: 'Rainbow Warrior',
        description: 'Own items in 7+ different colors',
        category: 'secret',
        iconName: 'color-palette',
        hint: '??? - Collect the rainbow',
    },
    {
        id: 'og_member',
        name: 'OG Member',
        description: 'Joined during launch month',
        category: 'secret',
        iconName: 'shield-checkmark',
        hint: '??? - Were you here from the start?',
    },
    {
        id: 'weather_warrior',
        name: 'Weather Warrior',
        description: 'Log an outfit during rain or snow',
        category: 'secret',
        iconName: 'rainy',
        hint: '??? - Brave the elements',
    },
    // Challenge badges
    {
        id: 'safari_explorer',
        name: 'Safari Explorer',
        description: 'Complete the Closet Safari challenge',
        category: 'challenge',
        iconName: 'compass',
        hint: 'Complete the onboarding challenge',
    },
] as const;

export const BADGE_CATEGORY_LABELS: Record<BadgeCategory, string> = {
    upload: 'Upload',
    engagement: 'Engagement',
    sustainability: 'Sustainability',
    secret: 'Secret',
    challenge: 'Challenge',
};
