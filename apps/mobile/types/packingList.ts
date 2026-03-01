/**
 * Packing List Types
 * Story 12.6: Travel Mode Packing Suggestions
 */

import { OccasionType } from './context';

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
