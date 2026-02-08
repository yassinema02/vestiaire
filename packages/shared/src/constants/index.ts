// App constants
export const APP_NAME = 'Vestiaire';
export const APP_SLUG = 'vestiaire';

// Gamification levels
export const LEVELS = [
    { level: 1, title: 'Closet Rookie', threshold: 0 },
    { level: 2, title: 'Wardrobe Builder', threshold: 10 },
    { level: 3, title: 'Style Explorer', threshold: 25 },
    { level: 4, title: 'Fashion Curator', threshold: 50 },
    { level: 5, title: 'Trend Setter', threshold: 100 },
    { level: 6, title: 'Style Master', threshold: 200 },
] as const;

// Points
export const POINTS = {
    UPLOAD_ITEM: 10,
    LOG_OUTFIT: 5,
    COMPLETE_STREAK: 3,
    FIRST_ITEM_OF_DAY: 2,
    COMPLETE_CHALLENGE: 50,
} as const;

// Freemium limits
export const FREE_TIER_LIMITS = {
    AI_SUGGESTIONS_PER_DAY: 3,
    RESALE_LISTINGS_PER_MONTH: 2,
} as const;

// CPW thresholds (in GBP)
export const CPW_THRESHOLDS = {
    GOOD: 5,
    MEDIUM: 20,
} as const;

// Streak milestones (day thresholds that trigger bonus rewards)
export const STREAK_MILESTONES = [7, 30, 100] as const;

// Neglected item days
export const NEGLECTED_DAYS = 60;

// Badges
export * from './badges';
