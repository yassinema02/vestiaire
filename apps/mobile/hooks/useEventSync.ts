/**
 * useEventSync Hook
 * Triggers event sync on app foreground if cooldown has elapsed
 * Story 12.2: Event Detection & Classification
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useCalendarStore } from '../stores/calendarStore';
import { eventSyncService } from '../services/eventSyncService';
import { eventClassificationService } from '../services/eventClassificationService';

export function useEventSync() {
    const appState = useRef(AppState.currentState);
    const { isConnected } = useCalendarStore();
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncResult, setLastSyncResult] = useState<{ synced: number } | null>(null);

    const triggerSync = useCallback(async () => {
        if (!isConnected || isSyncing) return;

        const shouldSync = await eventSyncService.shouldSync();
        if (!shouldSync) return;

        setIsSyncing(true);
        try {
            const { synced, error } = await eventSyncService.syncEvents();
            if (!error && synced > 0) {
                // Classify newly synced events
                await eventClassificationService.classifyUnclassified();
            }
            setLastSyncResult({ synced });
        } catch (error) {
            console.error('Event sync hook error:', error);
        } finally {
            setIsSyncing(false);
        }
    }, [isConnected, isSyncing]);

    // Sync on app foreground
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            if (appState.current.match(/inactive|background/) && nextState === 'active') {
                triggerSync();
            }
            appState.current = nextState;
        });

        return () => subscription.remove();
    }, [triggerSync]);

    // Initial sync on mount
    useEffect(() => {
        if (isConnected) {
            triggerSync();
        }
    }, [isConnected]);

    return {
        isSyncing,
        lastSyncResult,
        triggerSync,
    };
}
