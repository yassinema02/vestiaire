/**
 * Event Outfit Card Component
 * Shows event info, suggested outfit, and regenerate/save actions
 * Story 12.3: Event-Based Outfit Suggestions
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalendarEventRow } from '../../services/eventSyncService';
import { OutfitSuggestion, generateEventOutfit, clearEventOutfitCache, getFormalityGuidance, getEventTimeOfDay } from '../../services/aiOutfitService';
import { CalendarOutfitRow } from '../../services/calendarOutfitService';
import { EventClassificationBadge } from './EventClassificationBadge';
import { WardrobeItem } from '../../services/items';
import { EventType } from '../../services/eventClassificationService';

interface EventOutfitCardProps {
    event: CalendarEventRow;
    wardrobeItems: WardrobeItem[];
    expanded?: boolean;
    scheduledOutfit?: CalendarOutfitRow | null;
    onSaveOutfit?: (suggestion: OutfitSuggestion) => void;
    onChangeOutfit?: () => void;
}

const TYPE_ICONS: Record<string, string> = {
    work: 'briefcase-outline',
    social: 'people-outline',
    active: 'fitness-outline',
    formal: 'sparkles-outline',
    casual: 'cafe-outline',
};

function formatEventTime(startTime: string, isAllDay: boolean): string {
    if (isAllDay) return 'All day';
    const date = new Date(startTime);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

export const EventOutfitCard: React.FC<EventOutfitCardProps> = ({
    event,
    wardrobeItems,
    expanded = false,
    scheduledOutfit,
    onSaveOutfit,
    onChangeOutfit,
}) => {
    const [isExpanded, setIsExpanded] = useState(expanded);
    const [suggestion, setSuggestion] = useState<OutfitSuggestion | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Load suggestion when expanded
    useEffect(() => {
        if (isExpanded && !hasLoaded) {
            loadSuggestion();
        }
    }, [isExpanded]);

    const loadSuggestion = async () => {
        setIsLoading(true);
        const { suggestion: result } = await generateEventOutfit(event, wardrobeItems);
        setSuggestion(result);
        setIsLoading(false);
        setHasLoaded(true);
    };

    const handleRegenerate = async () => {
        setIsLoading(true);
        await clearEventOutfitCache(event.id);
        const { suggestion: result } = await generateEventOutfit(event, wardrobeItems, true);
        setSuggestion(result);
        setIsLoading(false);
    };

    const handleSave = () => {
        if (suggestion && onSaveOutfit) {
            onSaveOutfit(suggestion);
        }
    };

    // Get item details for thumbnails
    const suggestionItems = suggestion
        ? suggestion.items.map(id => wardrobeItems.find(w => w.id === id)).filter(Boolean) as WardrobeItem[]
        : [];

    const iconName = TYPE_ICONS[event.event_type || 'casual'] || 'calendar-outline';

    return (
        <View style={styles.card}>
            {/* Header — always visible */}
            <TouchableOpacity
                style={styles.header}
                onPress={() => setIsExpanded(!isExpanded)}
                activeOpacity={0.7}
            >
                <View style={styles.headerLeft}>
                    <Ionicons name={iconName as any} size={18} color="#5D4E37" />
                    <View style={styles.headerText}>
                        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                        <Text style={styles.eventTime}>
                            {formatEventTime(event.start_time, event.is_all_day)}
                        </Text>
                    </View>
                </View>
                <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#9ca3af"
                />
            </TouchableOpacity>

            {/* Classification badge */}
            <View style={styles.badgeRow}>
                <EventClassificationBadge
                    eventId={event.id}
                    eventType={event.event_type as EventType}
                    formalityScore={event.formality_score}
                    userCorrected={event.user_corrected}
                />
            </View>

            {/* Scheduled outfit indicator */}
            {scheduledOutfit && !isExpanded && (
                <View style={styles.scheduledRow}>
                    <Ionicons name="checkmark-circle" size={14} color="#7D9A78" />
                    <Text style={styles.scheduledText}>Outfit planned</Text>
                    {onChangeOutfit && (
                        <TouchableOpacity onPress={onChangeOutfit}>
                            <Text style={styles.changeLink}>Change</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Expanded: outfit suggestion */}
            {isExpanded && (
                <View style={styles.outfitSection}>
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#6366f1" />
                            <Text style={styles.loadingText}>Generating outfit...</Text>
                        </View>
                    ) : suggestion ? (
                        <>
                            {/* Item thumbnails */}
                            <View style={styles.itemGrid}>
                                {suggestionItems.slice(0, 4).map(item => (
                                    <View key={item.id} style={styles.itemThumb}>
                                        {item.image_url ? (
                                            <Image
                                                source={{ uri: item.image_url }}
                                                style={styles.itemImage}
                                            />
                                        ) : (
                                            <View style={styles.itemPlaceholder}>
                                                <Ionicons name="shirt-outline" size={20} color="#9ca3af" />
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </View>

                            {/* Outfit name + rationale */}
                            <Text style={styles.outfitName}>{suggestion.name}</Text>
                            <Text style={styles.rationale}>{suggestion.rationale}</Text>

                            {/* Actions */}
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.regenerateBtn} onPress={handleRegenerate}>
                                    <Ionicons name="refresh-outline" size={16} color="#6366f1" />
                                    <Text style={styles.regenerateText}>Regenerate</Text>
                                </TouchableOpacity>
                                {onSaveOutfit && (
                                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                        <Ionicons name="bookmark-outline" size={16} color="#fff" />
                                        <Text style={styles.saveText}>Save</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </>
                    ) : (
                        <Text style={styles.noSuggestion}>
                            Add more items to your wardrobe for outfit suggestions.
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        marginRight: 8,
    },
    headerText: {
        flex: 1,
    },
    eventTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
    },
    eventTime: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 1,
    },
    badgeRow: {
        paddingLeft: 28,
        marginTop: 4,
    },
    outfitSection: {
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    loadingText: {
        fontSize: 13,
        color: '#6b7280',
    },
    itemGrid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
    itemThumb: {
        width: 56,
        height: 56,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#f3f4f6',
    },
    itemImage: {
        width: '100%',
        height: '100%',
    },
    itemPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    outfitName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    rationale: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
    },
    regenerateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#eef2ff',
    },
    regenerateText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6366f1',
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#5D4E37',
    },
    saveText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#fff',
    },
    noSuggestion: {
        fontSize: 13,
        color: '#9ca3af',
        textAlign: 'center',
        paddingVertical: 12,
    },
    scheduledRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingLeft: 28,
        marginTop: 6,
    },
    scheduledText: {
        fontSize: 12,
        color: '#7D9A78',
        fontWeight: '500',
        flex: 1,
    },
    changeLink: {
        fontSize: 12,
        color: '#6366f1',
        fontWeight: '500',
    },
});
