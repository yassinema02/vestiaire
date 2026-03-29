/**
 * Manual Trip Service
 * CRUD for user-created trips + merged loading with calendar trips
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TripEvent, ManualTripEvent, TripType, TRIP_TYPE_LABELS } from '../types/packingList';
import { OccasionType } from '../utils/occasionDetector';
import { eventSyncService } from './eventSyncService';

function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

const MANUAL_TRIPS_KEY = 'manual_trips';
const PACKING_LIST_PREFIX = 'packing_list_';

/**
 * Map TripType to OccasionType for outfit generation
 */
const TRIP_TYPE_OCCASION_MAP: Record<TripType, OccasionType> = {
    vacation: 'casual',
    business: 'work',
    city_break: 'casual',
    adventure: 'sport',
    beach: 'casual',
    conference: 'formal',
};

function tripTypeToOccasion(tripType: TripType): OccasionType {
    return TRIP_TYPE_OCCASION_MAP[tripType] || 'casual';
}

function isExpired(endDate: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return endDate < today;
}

function computeDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

function buildTitle(tripType: TripType, destination: string): string {
    return `${TRIP_TYPE_LABELS[tripType]} — ${destination}`;
}

async function getManualTrips(): Promise<ManualTripEvent[]> {
    try {
        const raw = await AsyncStorage.getItem(MANUAL_TRIPS_KEY);
        const all: ManualTripEvent[] = raw ? JSON.parse(raw) : [];
        const active = all.filter(t => !isExpired(t.endDate));
        // Persist pruned list to avoid stale entries accumulating
        if (active.length !== all.length) {
            await AsyncStorage.setItem(MANUAL_TRIPS_KEY, JSON.stringify(active));
        }
        return active;
    } catch {
        return [];
    }
}

async function saveManualTrip(params: {
    destination: string;
    startDate: string;
    endDate: string;
    tripType: TripType;
}): Promise<ManualTripEvent> {
    const trip: ManualTripEvent = {
        id: generateId(),
        title: buildTitle(params.tripType, params.destination),
        startDate: params.startDate,
        endDate: params.endDate,
        durationDays: computeDuration(params.startDate, params.endDate),
        location: params.destination,
        tripType: params.tripType,
        isManual: true,
    };

    const trips = await getManualTrips();
    trips.push(trip);
    await AsyncStorage.setItem(MANUAL_TRIPS_KEY, JSON.stringify(trips));
    return trip;
}

async function updateManualTrip(updated: ManualTripEvent): Promise<void> {
    const trips = await getManualTrips();
    const idx = trips.findIndex(t => t.id === updated.id);
    if (idx === -1) return;

    // Recompute derived fields
    updated.title = buildTitle(updated.tripType, updated.location);
    updated.durationDays = computeDuration(updated.startDate, updated.endDate);

    trips[idx] = updated;
    await AsyncStorage.setItem(MANUAL_TRIPS_KEY, JSON.stringify(trips));
}

async function deleteManualTrip(id: string): Promise<void> {
    const trips = await getManualTrips();
    const filtered = trips.filter(t => t.id !== id);
    await AsyncStorage.setItem(MANUAL_TRIPS_KEY, JSON.stringify(filtered));
    // Clean up associated packing list
    await AsyncStorage.removeItem(PACKING_LIST_PREFIX + id);
}

async function getAllTrips(): Promise<TripEvent[]> {
    const [manualTrips, calendarResult] = await Promise.all([
        getManualTrips(),
        eventSyncService.detectTripEvents(30),
    ]);

    const all: TripEvent[] = [...calendarResult.trips, ...manualTrips];
    return all.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export const manualTripService = {
    getManualTrips,
    saveManualTrip,
    updateManualTrip,
    deleteManualTrip,
    getAllTrips,
    tripTypeToOccasion,
    buildTitle,
    computeDuration,
    isExpired,
};
