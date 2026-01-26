// User types
export interface User {
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
    premium_until: Date | null;
    created_at: Date;
    updated_at: Date;
}

// Item (clothing) types
export type Category = 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'shoes' | 'accessories';
export type Season = 'spring' | 'summer' | 'fall' | 'winter' | 'all';
export type Occasion = 'casual' | 'work' | 'formal' | 'sport' | 'night_out';

export interface Item {
    id: string;
    user_id: string;
    name: string | null;
    category: Category;
    sub_category: string | null;
    color: string;
    brand: string | null;
    purchase_price: number | null;
    purchase_date: Date | null;
    image_url: string;
    original_image_url: string;
    seasons: Season[];
    occasions: Occasion[];
    is_favorite: boolean;
    wear_count: number;
    last_worn_at: Date | null;
    created_at: Date;
}

// Outfit types
export interface Outfit {
    id: string;
    user_id: string;
    name: string | null;
    occasion: Occasion | null;
    is_ai_generated: boolean;
    weather_context: WeatherContext | null;
    created_at: Date;
}

export interface OutfitItem {
    outfit_id: string;
    item_id: string;
    position: 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear';
}

// Weather types
export interface WeatherContext {
    temp: number;
    feels_like: number;
    condition: string;
    icon: string;
}

// Gamification types
export interface UserStats {
    user_id: string;
    level: number;
    style_points: number;
    current_streak: number;
    longest_streak: number;
    last_active_date: Date | null;
    ai_suggestions_today: number;
    resale_listings_month: number;
}
