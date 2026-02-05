/**
 * Occasion Detector Utility
 * Detects event occasion type from event title and location
 */

export type OccasionType = 'work' | 'social' | 'formal' | 'sport' | 'casual';

interface OccasionKeywords {
    type: OccasionType;
    keywords: string[];
}

// Keyword patterns for each occasion type (ordered by priority)
const OCCASION_PATTERNS: OccasionKeywords[] = [
    {
        type: 'formal',
        keywords: [
            'wedding', 'gala', 'ceremony', 'reception', 'award', 'graduation',
            'fundraiser', 'black tie', 'formal', 'banquet', 'ball', 'charity',
            'anniversary dinner', 'engagement',
        ],
    },
    {
        type: 'work',
        keywords: [
            'meeting', 'standup', 'stand-up', 'sync', 'review', 'interview',
            'presentation', 'call', '1:1', '1-1', 'one-on-one', 'workshop',
            'training', 'conference', 'seminar', 'webinar', 'demo', 'sprint',
            'retro', 'planning', 'kickoff', 'kick-off', 'all-hands', 'town hall',
            'client', 'stakeholder', 'board', 'quarterly', 'offsite', 'onsite',
        ],
    },
    {
        type: 'sport',
        keywords: [
            'gym', 'workout', 'yoga', 'run', 'running', 'tennis', 'golf',
            'swim', 'swimming', 'hike', 'hiking', 'fitness', 'class', 'pilates',
            'crossfit', 'spinning', 'cycling', 'bike', 'basketball', 'football',
            'soccer', 'boxing', 'martial', 'climbing', 'training session',
        ],
    },
    {
        type: 'social',
        keywords: [
            'lunch', 'coffee', 'drinks', 'party', 'birthday', 'brunch',
            'hangout', 'hang out', 'catch up', 'date', 'dinner', 'bbq',
            'barbecue', 'picnic', 'get together', 'get-together', 'reunion',
            'happy hour', 'celebration', 'shower', 'housewarming',
        ],
    },
];

// Location-based hints
const LOCATION_HINTS: { keywords: string[]; type: OccasionType }[] = [
    { keywords: ['gym', 'fitness', 'studio', 'court', 'pool', 'track'], type: 'sport' },
    { keywords: ['office', 'conference room', 'meeting room', 'headquarters'], type: 'work' },
    { keywords: ['restaurant', 'bar', 'cafe', 'pub', 'club'], type: 'social' },
    { keywords: ['hotel', 'ballroom', 'venue', 'church', 'temple'], type: 'formal' },
];

/**
 * Normalize text for matching (lowercase, remove extra spaces)
 */
function normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if text contains any of the keywords
 */
function containsKeyword(text: string, keywords: string[]): boolean {
    const normalizedText = normalizeText(text);
    return keywords.some(keyword => normalizedText.includes(keyword.toLowerCase()));
}

/**
 * Detect occasion type from event title and optional location
 * @param title - Event title/summary
 * @param location - Optional event location
 * @returns Detected occasion type
 */
export function detectOccasion(
    title: string | null | undefined,
    location?: string | null
): OccasionType {
    if (!title) return 'casual';

    const normalizedTitle = normalizeText(title);

    // Check title against occasion patterns (in priority order)
    for (const pattern of OCCASION_PATTERNS) {
        if (containsKeyword(normalizedTitle, pattern.keywords)) {
            return pattern.type;
        }
    }

    // Check location for hints if title didn't match
    if (location) {
        for (const hint of LOCATION_HINTS) {
            if (containsKeyword(location, hint.keywords)) {
                return hint.type;
            }
        }
    }

    // Default to casual if no matches
    return 'casual';
}

/**
 * Get human-readable label for occasion type
 */
export function getOccasionLabel(occasion: OccasionType): string {
    const labels: Record<OccasionType, string> = {
        work: 'Work',
        social: 'Social',
        formal: 'Formal',
        sport: 'Sport',
        casual: 'Casual',
    };
    return labels[occasion];
}

/**
 * Get color for occasion badge
 */
export function getOccasionColor(occasion: OccasionType): string {
    const colors: Record<OccasionType, string> = {
        work: '#3b82f6',     // Blue
        social: '#f59e0b',   // Amber
        formal: '#8b5cf6',   // Purple
        sport: '#10b981',    // Green
        casual: '#6b7280',   // Gray
    };
    return colors[occasion];
}

/**
 * Get icon name for occasion type (Ionicons)
 */
export function getOccasionIcon(occasion: OccasionType): string {
    const icons: Record<OccasionType, string> = {
        work: 'briefcase-outline',
        social: 'people-outline',
        formal: 'sparkles-outline',
        sport: 'fitness-outline',
        casual: 'cafe-outline',
    };
    return icons[occasion];
}
