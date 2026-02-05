/**
 * Events Widget Component
 * Displays today's calendar events with occasion badges
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCalendarStore, CalendarEvent } from '../../stores/calendarStore';
import { getOccasionLabel, getOccasionColor, getOccasionIcon, OccasionType } from '../../utils/occasionDetector';

interface EventCardProps {
    event: CalendarEvent;
}

function EventCard({ event }: EventCardProps) {
    const occasionColor = getOccasionColor(event.occasion);
    const occasionIcon = getOccasionIcon(event.occasion);
    const occasionLabel = getOccasionLabel(event.occasion);

    // Source indicator color
    const sourceColor = event.source === 'google' ? '#4285f4' : '#007AFF';

    return (
        <View style={styles.eventCard}>
            <View style={styles.eventTimeColumn}>
                <Text style={styles.eventTime}>{event.startTime}</Text>
                {!event.isAllDay && event.endTime && (
                    <Text style={styles.eventEndTime}>{event.endTime}</Text>
                )}
                {/* Source indicator dot */}
                <View style={[styles.sourceIndicator, { backgroundColor: sourceColor }]} />
            </View>

            <View style={styles.eventDivider} />

            <View style={styles.eventContent}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                    {event.title}
                </Text>

                <View style={[styles.occasionBadge, { backgroundColor: `${occasionColor}15` }]}>
                    <Ionicons
                        name={occasionIcon as keyof typeof Ionicons.glyphMap}
                        size={12}
                        color={occasionColor}
                    />
                    <Text style={[styles.occasionText, { color: occasionColor }]}>
                        {occasionLabel}
                    </Text>
                </View>

                {event.location && (
                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={12} color="#9ca3af" />
                        <Text style={styles.locationText} numberOfLines={1}>
                            {event.location}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

interface ConnectPromptProps {
    onConnect: () => void;
}

function ConnectPrompt({ onConnect }: ConnectPromptProps) {
    return (
        <View style={styles.connectPrompt}>
            <View style={styles.connectIconContainer}>
                <Ionicons name="calendar-outline" size={32} color="#9ca3af" />
            </View>
            <Text style={styles.connectTitle}>Connect Your Calendar</Text>
            <Text style={styles.connectSubtitle}>
                Get outfit suggestions based on your schedule
            </Text>
            <TouchableOpacity style={styles.connectButton} onPress={onConnect}>
                <Ionicons name="logo-google" size={18} color="#fff" />
                <Text style={styles.connectButtonText}>Connect Google Calendar</Text>
            </TouchableOpacity>
        </View>
    );
}

function EmptyState() {
    return (
        <View style={styles.emptyState}>
            <Ionicons name="sunny-outline" size={28} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No events today</Text>
            <Text style={styles.emptySubtitle}>Enjoy your free day!</Text>
        </View>
    );
}

interface EventsWidgetProps {
    onConnectPress?: () => void;
}

export function EventsWidget({ onConnectPress }: EventsWidgetProps) {
    const {
        events,
        isConnected,
        isLoading,
        error,
        refreshEvents,
    } = useCalendarStore();

    // Not connected state
    if (!isConnected) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Ionicons name="calendar-outline" size={20} color="#9ca3af" />
                        <Text style={[styles.headerTitle, styles.headerTitleMuted]}>Today's Events</Text>
                    </View>
                </View>
                <ConnectPrompt onConnect={onConnectPress || (() => { })} />
            </View>
        );
    }

    // Loading state (first load only)
    if (isLoading && events.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Ionicons name="calendar-outline" size={20} color="#6366f1" />
                        <Text style={styles.headerTitle}>Today's Events</Text>
                    </View>
                    <ActivityIndicator size="small" color="#6366f1" />
                </View>
            </View>
        );
    }

    // Error state
    if (error && events.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Ionicons name="calendar-outline" size={20} color="#ef4444" />
                        <Text style={styles.headerTitle}>Today's Events</Text>
                    </View>
                </View>
                <View style={styles.errorState}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => refreshEvents(true)}
                    >
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons name="calendar-outline" size={20} color="#6366f1" />
                    <Text style={styles.headerTitle}>Today's Events</Text>
                    {events.length > 0 && (
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{events.length}</Text>
                        </View>
                    )}
                </View>
                {isLoading && (
                    <ActivityIndicator size="small" color="#6366f1" />
                )}
            </View>

            {/* Events List or Empty State */}
            {events.length === 0 ? (
                <EmptyState />
            ) : (
                <View style={styles.eventsList}>
                    {events.slice(0, 3).map((event) => (
                        <EventCard key={event.id} event={event} />
                    ))}
                    {events.length > 3 && (
                        <Text style={styles.moreText}>
                            +{events.length - 3} more event{events.length - 3 > 1 ? 's' : ''}
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    headerTitleMuted: {
        color: '#9ca3af',
    },
    countBadge: {
        backgroundColor: '#eef2ff',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginLeft: 4,
    },
    countText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6366f1',
    },
    // Events List
    eventsList: {
        padding: 12,
        gap: 8,
    },
    eventCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 12,
    },
    eventTimeColumn: {
        width: 56,
        alignItems: 'flex-end',
        paddingRight: 12,
    },
    eventTime: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1f2937',
    },
    eventEndTime: {
        fontSize: 11,
        color: '#9ca3af',
        marginTop: 2,
    },
    sourceIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 4,
        alignSelf: 'center',
    },
    eventDivider: {
        width: 2,
        height: '100%',
        backgroundColor: '#e5e7eb',
        borderRadius: 1,
        marginRight: 12,
    },
    eventContent: {
        flex: 1,
    },
    eventTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 6,
    },
    occasionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 4,
    },
    occasionText: {
        fontSize: 11,
        fontWeight: '600',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    locationText: {
        fontSize: 12,
        color: '#9ca3af',
        flex: 1,
    },
    moreText: {
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center',
        paddingVertical: 8,
    },
    // Connect Prompt
    connectPrompt: {
        alignItems: 'center',
        padding: 24,
    },
    connectIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    connectTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    connectSubtitle: {
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 16,
    },
    connectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#4285f4',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
    },
    connectButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        padding: 24,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        marginTop: 8,
    },
    emptySubtitle: {
        fontSize: 13,
        color: '#9ca3af',
        marginTop: 4,
    },
    // Error State
    errorState: {
        alignItems: 'center',
        padding: 16,
    },
    errorText: {
        fontSize: 13,
        color: '#ef4444',
        textAlign: 'center',
        marginBottom: 12,
    },
    retryButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#fef2f2',
        borderRadius: 8,
    },
    retryText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#ef4444',
    },
});
