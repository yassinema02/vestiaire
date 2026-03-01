/**
 * User Profile Types
 * Profile Setup Onboarding
 */

export type Gender = 'man' | 'woman' | 'non-binary' | 'prefer-not-to-say';

export interface UserProfile {
    gender?: Gender;
    birth_year?: number;
    height_cm?: number;
    weight_kg?: number;
    style_tags: string[];
}

export interface StyleOption {
    id: string;
    label: string;
    imageUrl: string;
    keywords: string[];
}
