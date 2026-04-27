/**
 * Packing List Types
 * Story 12.6: Travel Mode Packing Suggestions
 */

import { OccasionType } from '../utils/occasionDetector';

export interface TripEvent {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    durationDays: number;
    location: string | null;
}

export interface PackingDay {
    date: string;
    eventTitle: string | null;
    occasionType: OccasionType;
    outfitItems: { id: string; name: string; category: string }[];
}

export interface PackingItem {
    id: string;
    name: string;
    category: string;
    imageUrl?: string;
    days: string[];
    packed: boolean;
}

export interface PackingList {
    tripId: string;
    tripTitle: string;
    startDate: string;
    endDate: string;
    days: PackingDay[];
    items: PackingItem[];
    summary: string;
    generatedAt: string;
}

export type TripType = 'vacation' | 'business' | 'city_break' | 'adventure' | 'beach' | 'conference';

export interface ManualTripEvent extends TripEvent {
    tripType: TripType;
    isManual: true;
    location: string; // narrowed — always non-null for manual trips
}

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
    vacation: 'Vacation',
    business: 'Business',
    city_break: 'City Break',
    adventure: 'Adventure',
    beach: 'Beach',
    conference: 'Conference',
};

export const TRIP_TYPE_ICONS: Record<TripType, string> = {
    vacation: 'sunny-outline',
    business: 'briefcase-outline',
    city_break: 'business-outline',
    adventure: 'trail-sign-outline',
    beach: 'umbrella-outline',
    conference: 'people-outline',
};

export interface GeocodedLocation {
    lat: number;
    lon: number;
    displayName: string;
}

export interface DailyWeatherForecast {
    date: string; // YYYY-MM-DD
    tempHigh: number;
    tempLow: number;
    precipitationProbability: number;
    weatherCode: number;
}

export interface TripAnalyticsEvent {
    name: 'trip_created' | 'packing_list_generated' | 'packing_list_exported' | 'packing_item_toggled';
    data: Record<string, string | number | boolean>;
    timestamp: string;
}
