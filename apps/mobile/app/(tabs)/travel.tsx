/**
 * Travel Mode Screen
 * Trip detection, packing list generation, checklist, and export
 * Story 12.6: Travel Mode Packing Suggestions
 */

import { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Share,
    Platform,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { eventSyncService } from '../../services/eventSyncService';
import { tripPackingService } from '../../services/tripPackingService';
import { itemsService, WardrobeItem } from '../../services/items';
import { TripEvent, PackingList } from '../../types/packingList';

export default function TravelScreen() {
    const router = useRouter();
    const [trips, setTrips] = useState<TripEvent[]>([]);
    const [selectedTrip, setSelectedTrip] = useState<TripEvent | null>(null);
    const [packingList, setPackingList] = useState<PackingList | null>(null);
    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

    const loadData = useCallback(async () => {
        setIsLoading(true);

        const [tripsResult, itemsResult] = await Promise.all([
            eventSyncService.detectTripEvents(30),
            itemsService.getItems(),
        ]);

        setTrips(tripsResult.trips);
        setWardrobeItems(itemsResult.items || []);

        if (tripsResult.trips.length > 0) {
            const first = tripsResult.trips[0];
            setSelectedTrip(first);

            // Load cached packing list
            const cached = await tripPackingService.getPackingList(first.id);
            if (cached) setPackingList(cached);
        }

        setIsLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const handleSelectTrip = async (trip: TripEvent) => {
        setSelectedTrip(trip);
        setPackingList(null);
        const cached = await tripPackingService.getPackingList(trip.id);
        if (cached) setPackingList(cached);
    };

    const handleGenerate = async () => {
        if (!selectedTrip) return;
        setIsGenerating(true);
        const { list } = await tripPackingService.generatePackingList(selectedTrip, wardrobeItems);
        setPackingList(list);
        setIsGenerating(false);
    };

    const handleTogglePacked = async (itemId: string) => {
        if (!packingList || !selectedTrip) return;
        const item = packingList.items.find(i => i.id === itemId);
        if (!item) return;

        await tripPackingService.markItemPacked(selectedTrip.id, itemId, !item.packed);
        // Update local state
        setPackingList(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                items: prev.items.map(i =>
                    i.id === itemId ? { ...i, packed: !i.packed } : i
                ),
            };
        });
    };

    const handleToggleDay = (date: string) => {
        setExpandedDays(prev => {
            const next = new Set(prev);
            if (next.has(date)) next.delete(date);
            else next.add(date);
            return next;
        });
    };

    const handleExport = async () => {
        if (!packingList) return;
        const text = tripPackingService.exportPackingList(packingList);
        await Share.share({ message: text });
    };

    const handleRegenerate = async () => {
        if (!selectedTrip) return;
        setPackingList(null);
        await handleGenerate();
    };

    const packedCount = packingList?.items.filter(i => i.packed).length || 0;
    const totalItems = packingList?.items.length || 0;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Travel Mode</Text>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : trips.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="airplane-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>No trips detected</Text>
                    <Text style={styles.emptyText}>
                        Add a multi-day event or event with "trip", "travel", or "conference" in the title to your calendar.
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Trip selector */}
                    {trips.length > 1 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.tripSelector}
                            contentContainerStyle={styles.tripSelectorContent}
                        >
                            {trips.map(trip => (
                                <TouchableOpacity
                                    key={trip.id}
                                    style={[
                                        styles.tripChip,
                                        selectedTrip?.id === trip.id && styles.tripChipSelected,
                                    ]}
                                    onPress={() => handleSelectTrip(trip)}
                                >
                                    <Text style={[
                                        styles.tripChipText,
                                        selectedTrip?.id === trip.id && styles.tripChipTextSelected,
                                    ]}>
                                        {trip.title}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}

                    {/* Trip info card */}
                    {selectedTrip && (
                        <View style={styles.tripCard}>
                            <Ionicons name="airplane" size={20} color="#6366f1" />
                            <View style={styles.tripCardInfo}>
                                <Text style={styles.tripCardTitle}>{selectedTrip.title}</Text>
                                <Text style={styles.tripCardDates}>
                                    {selectedTrip.startDate} to {selectedTrip.endDate} ({selectedTrip.durationDays} day{selectedTrip.durationDays !== 1 ? 's' : ''})
                                </Text>
                                {selectedTrip.location && (
                                    <Text style={styles.tripCardLocation}>
                                        {selectedTrip.location}
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Generate button */}
                    {!packingList && selectedTrip && (
                        <TouchableOpacity
                            style={styles.generateBtn}
                            onPress={handleGenerate}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="sparkles-outline" size={18} color="#fff" />
                                    <Text style={styles.generateBtnText}>Generate Packing List</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Packing list */}
                    {packingList && (
                        <>
                            {/* Summary */}
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryText}>
                                    {packingList.days.length} day{packingList.days.length !== 1 ? 's' : ''} · {packingList.summary}
                                </Text>
                                <Text style={styles.packedProgress}>
                                    {packedCount}/{totalItems} packed
                                </Text>
                            </View>

                            {/* Day-by-day view */}
                            <Text style={styles.sectionLabel}>Daily Outfits</Text>
                            {packingList.days.map((day, i) => {
                                const isExpanded = expandedDays.has(day.date);
                                const dayDate = new Date(day.date);
                                const dayLabel = dayDate.toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                });

                                return (
                                    <View key={day.date} style={styles.dayCard}>
                                        <TouchableOpacity
                                            style={styles.dayHeader}
                                            onPress={() => handleToggleDay(day.date)}
                                        >
                                            <View style={styles.dayHeaderLeft}>
                                                <Text style={styles.dayNumber}>Day {i + 1}</Text>
                                                <Text style={styles.dayDate}>{dayLabel}</Text>
                                                {day.eventTitle && (
                                                    <Text style={styles.dayEvent} numberOfLines={1}>
                                                        · {day.eventTitle}
                                                    </Text>
                                                )}
                                            </View>
                                            <Ionicons
                                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                                size={18}
                                                color="#9ca3af"
                                            />
                                        </TouchableOpacity>
                                        {isExpanded && (
                                            <View style={styles.dayItems}>
                                                {day.outfitItems.map(item => {
                                                    const w = wardrobeItems.find(wi => wi.id === item.id);
                                                    return (
                                                        <View key={item.id} style={styles.dayItem}>
                                                            {w?.image_url ? (
                                                                <Image
                                                                    source={{ uri: w.image_url }}
                                                                    style={styles.dayItemImage}
                                                                />
                                                            ) : (
                                                                <View style={styles.dayItemPlaceholder}>
                                                                    <Ionicons name="shirt-outline" size={16} color="#9ca3af" />
                                                                </View>
                                                            )}
                                                            <Text style={styles.dayItemName}>{item.name}</Text>
                                                        </View>
                                                    );
                                                })}
                                                {day.outfitItems.length === 0 && (
                                                    <Text style={styles.noOutfitText}>No outfit generated</Text>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                );
                            })}

                            {/* Packing checklist */}
                            <Text style={styles.sectionLabel}>
                                Packing Checklist ({totalItems})
                            </Text>
                            <View style={styles.checklistCard}>
                                {packingList.items.map(item => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.checklistRow}
                                        onPress={() => handleTogglePacked(item.id)}
                                    >
                                        <Ionicons
                                            name={item.packed ? 'checkbox' : 'square-outline'}
                                            size={22}
                                            color={item.packed ? '#7D9A78' : '#d1d5db'}
                                        />
                                        <Text style={[
                                            styles.checklistName,
                                            item.packed && styles.checklistNamePacked,
                                        ]}>
                                            {item.name}
                                        </Text>
                                        {item.days.length > 1 && (
                                            <Text style={styles.checklistDays}>
                                                ({item.days.map(d =>
                                                    new Date(d).toLocaleDateString('en-US', { weekday: 'short' })
                                                ).join(' + ')})
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Action buttons */}
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
                                    <Ionicons name="share-outline" size={16} color="#5D4E37" />
                                    <Text style={styles.exportBtnText}>Export List</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.regenerateBtn} onPress={handleRegenerate}>
                                    <Ionicons name="refresh-outline" size={16} color="#6366f1" />
                                    <Text style={styles.regenerateBtnText}>Regenerate</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
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
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },

    // Trip selector
    tripSelector: {
        marginBottom: 12,
    },
    tripSelectorContent: {
        gap: 8,
    },
    tripChip: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: '#fff',
    },
    tripChipSelected: {
        backgroundColor: '#eef2ff',
    },
    tripChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
    },
    tripChipTextSelected: {
        color: '#6366f1',
    },

    // Trip card
    tripCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 14,
    },
    tripCardInfo: {
        flex: 1,
    },
    tripCardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    tripCardDates: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 4,
    },
    tripCardLocation: {
        fontSize: 13,
        color: '#5D4E37',
        marginTop: 2,
    },

    // Generate button
    generateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#5D4E37',
        borderRadius: 12,
        paddingVertical: 14,
        marginBottom: 14,
    },
    generateBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },

    // Summary
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#eef2ff',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
    },
    summaryText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    packedProgress: {
        fontSize: 13,
        color: '#6366f1',
        fontWeight: '500',
    },

    // Section label
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#5D4E37',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 4,
    },

    // Day card
    dayCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 8,
        overflow: 'hidden',
    },
    dayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
    },
    dayHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    dayNumber: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6366f1',
    },
    dayDate: {
        fontSize: 13,
        color: '#374151',
        fontWeight: '500',
    },
    dayEvent: {
        fontSize: 12,
        color: '#6b7280',
        flex: 1,
    },
    dayItems: {
        paddingHorizontal: 12,
        paddingBottom: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dayItem: {
        alignItems: 'center',
        gap: 4,
    },
    dayItemImage: {
        width: 48,
        height: 48,
        borderRadius: 8,
    },
    dayItemPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayItemName: {
        fontSize: 11,
        color: '#6b7280',
        maxWidth: 60,
        textAlign: 'center',
    },
    noOutfitText: {
        fontSize: 13,
        color: '#9ca3af',
        paddingVertical: 4,
    },

    // Checklist
    checklistCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 4,
        marginBottom: 16,
    },
    checklistRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 10,
    },
    checklistName: {
        fontSize: 14,
        color: '#1f2937',
        flex: 1,
    },
    checklistNamePacked: {
        textDecorationLine: 'line-through',
        color: '#9ca3af',
    },
    checklistDays: {
        fontSize: 11,
        color: '#9ca3af',
    },

    // Actions
    actionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    exportBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingVertical: 12,
    },
    exportBtnText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#5D4E37',
    },
    regenerateBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#eef2ff',
        borderRadius: 10,
        paddingVertical: 12,
    },
    regenerateBtnText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6366f1',
    },
});
