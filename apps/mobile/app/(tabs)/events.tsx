/**
 * Upcoming Events Screen
 * 7-day event list with outfit suggestions
 * Story 12.3: Event-Based Outfit Suggestions
 */

import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { eventSyncService, CalendarEventRow } from '../../services/eventSyncService';
import { eventClassificationService } from '../../services/eventClassificationService';
import { calendarOutfitService, CalendarOutfitRow } from '../../services/calendarOutfitService';
import { EventOutfitCard } from '../../components/features/EventOutfitCard';
import { itemsService, WardrobeItem } from '../../services/items';

/**
 * Group events by date label (Today, Tomorrow, day name)
 */
function groupEventsByDate(events: CalendarEventRow[]): { label: string; date: string; events: CalendarEventRow[] }[] {
    const groups: Map<string, { label: string; events: CalendarEventRow[] }> = new Map();

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const event of events) {
        const dateStr = event.start_time.split('T')[0];
        if (!groups.has(dateStr)) {
            let label: string;
            if (dateStr === today) {
                label = 'Today';
            } else if (dateStr === tomorrow) {
                label = 'Tomorrow';
            } else {
                const d = new Date(event.start_time);
                label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            }
            groups.set(dateStr, { label, events: [] });
        }
        groups.get(dateStr)!.events.push(event);
    }

    return Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, group]) => ({ date, label: group.label, events: group.events }));
}

export default function EventsScreen() {
    const router = useRouter();
    const [events, setEvents] = useState<CalendarEventRow[]>([]);
    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
    const [scheduledOutfits, setScheduledOutfits] = useState<CalendarOutfitRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);

        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 7);
        const startStr = now.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const [eventsResult, itemsResult, scheduledResult] = await Promise.all([
            eventSyncService.getUpcomingEvents(7),
            itemsService.getItems(),
            calendarOutfitService.getScheduledOutfits(startStr, endStr),
        ]);

        setEvents(eventsResult.events);
        setWardrobeItems(itemsResult.items || []);
        setScheduledOutfits(scheduledResult.outfits);
        setIsLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const handleRefresh = async () => {
        setIsSyncing(true);
        await eventSyncService.syncEvents();
        await eventClassificationService.classifyUnclassified();
        await loadData();
        setIsSyncing(false);
    };

    const grouped = groupEventsByDate(events);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Upcoming Events</Text>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={handleRefresh}
                    disabled={isSyncing}
                >
                    {isSyncing ? (
                        <ActivityIndicator size="small" color="#6366f1" />
                    ) : (
                        <Ionicons name="refresh-outline" size={22} color="#6366f1" />
                    )}
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : grouped.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>No upcoming events</Text>
                    <Text style={styles.emptyText}>
                        Connect your calendar in Settings to see outfit suggestions for your events.
                    </Text>
                    <TouchableOpacity
                        style={styles.connectButton}
                        onPress={() => router.push('/(tabs)/calendar-settings')}
                    >
                        <Text style={styles.connectButtonText}>Connect Calendar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {grouped.map(group => (
                        <View key={group.date} style={styles.dateGroup}>
                            <Text style={styles.dateLabel}>{group.label}</Text>
                            <View style={styles.eventList}>
                                {group.events.map(event => (
                                    <EventOutfitCard
                                        key={event.id}
                                        event={event}
                                        wardrobeItems={wardrobeItems}
                                        scheduledOutfit={scheduledOutfits.find(o => o.event_id === event.id)}
                                    />
                                ))}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 16,
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        flex: 1,
        fontSize: 22,
        fontWeight: '600',
        color: '#1f2937',
    },
    refreshButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    connectButton: {
        marginTop: 20,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#6366f1',
        borderRadius: 10,
    },
    connectButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    dateGroup: {
        marginBottom: 20,
    },
    dateLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#5D4E37',
        marginBottom: 10,
    },
    eventList: {
        gap: 10,
    },
});
