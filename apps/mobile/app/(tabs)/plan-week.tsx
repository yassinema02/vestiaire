/**
 * Plan Week Screen
 * 7-day calendar with outfit scheduling
 * Story 12.4: Outfit Scheduling & Planning
 */

import { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    FlatList,
    Image,
    ActivityIndicator,
    Modal,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { calendarOutfitService, CalendarOutfitRow } from '../../services/calendarOutfitService';
import { eventSyncService, CalendarEventRow } from '../../services/eventSyncService';
import { itemsService, WardrobeItem } from '../../services/items';
import { outfitService } from '../../services/outfitService';
import { generateEventOutfit, OutfitSuggestion } from '../../services/aiOutfitService';
import { useWeatherStore } from '../../stores/weatherStore';
import { DailyForecast } from '../../services/weather';
import { Outfit } from '../../types/outfit';

interface DayData {
    date: string;
    label: string;
    dayName: string;
    isToday: boolean;
    events: CalendarEventRow[];
    scheduledOutfit: CalendarOutfitRow | null;
    forecast: DailyForecast | null;
}

function buildWeekDays(
    events: CalendarEventRow[],
    scheduledOutfits: CalendarOutfitRow[],
    forecast: DailyForecast[] | null
): DayData[] {
    const now = new Date();
    const days: DayData[] = [];

    for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const isToday = i === 0;

        const dayEvents = events.filter(e => e.start_time.split('T')[0] === dateStr);

        const dayOutfit = scheduledOutfits.find(o =>
            o.scheduled_date === dateStr ||
            (o.event_id && dayEvents.some(e => e.id === o.event_id))
        ) || null;

        const dayForecast = forecast?.find(f => f.date === dateStr) || null;

        let label: string;
        if (isToday) {
            label = 'Today';
        } else if (i === 1) {
            label = 'Tomorrow';
        } else {
            label = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
        }

        days.push({
            date: dateStr,
            label,
            dayName: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
            isToday,
            events: dayEvents,
            scheduledOutfit: dayOutfit,
            forecast: dayForecast,
        });
    }

    return days;
}

function getWeatherIcon(condition: string): string {
    const c = condition.toLowerCase();
    if (c.includes('rain') || c.includes('drizzle')) return 'rainy-outline';
    if (c.includes('cloud') || c.includes('overcast')) return 'cloudy-outline';
    if (c.includes('snow')) return 'snow-outline';
    if (c.includes('thunder') || c.includes('storm')) return 'thunderstorm-outline';
    return 'sunny-outline';
}

export default function PlanWeekScreen() {
    const router = useRouter();
    const { weather, forecast } = useWeatherStore();

    const [days, setDays] = useState<DayData[]>([]);
    const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
    const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [suggestion, setSuggestion] = useState<OutfitSuggestion | null>(null);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [showOutfitPicker, setShowOutfitPicker] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);

        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 7);
        const startStr = now.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const [eventsResult, itemsResult, outfitsResult, scheduledResult] = await Promise.all([
            eventSyncService.getUpcomingEvents(7),
            itemsService.getItems(),
            outfitService.getOutfits(),
            calendarOutfitService.getScheduledOutfits(startStr, endStr),
        ]);

        setWardrobeItems(itemsResult.items || []);
        setSavedOutfits(outfitsResult.outfits || []);

        const weekDays = buildWeekDays(
            eventsResult.events,
            scheduledResult.outfits,
            forecast
        );
        setDays(weekDays);
        if (!selectedDay) setSelectedDay(weekDays[0]);
        setIsLoading(false);
    }, [forecast]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    // Update selected day when days change
    useEffect(() => {
        if (selectedDay && days.length > 0) {
            const updated = days.find(d => d.date === selectedDay.date);
            if (updated) setSelectedDay(updated);
        }
    }, [days]);

    const handleSelectDay = (day: DayData) => {
        setSelectedDay(day);
        setSuggestion(null);
    };

    const handleGenerateSuggestion = async () => {
        if (!selectedDay) return;
        setIsSuggesting(true);

        // Use highest-formality event if available
        const topEvent = [...selectedDay.events]
            .sort((a, b) => (b.formality_score || 0) - (a.formality_score || 0))[0];

        if (topEvent) {
            const result = await generateEventOutfit(topEvent, wardrobeItems);
            setSuggestion(result.suggestion);
        } else {
            // Import generateFallbackOutfit for non-event days
            const { generateFallbackOutfit } = require('../../services/aiOutfitService');
            const fallback = generateFallbackOutfit(wardrobeItems);
            setSuggestion(fallback);
        }
        setIsSuggesting(false);
    };

    const handleScheduleSuggestion = async () => {
        if (!selectedDay || !suggestion) return;
        setIsScheduling(true);

        const topEvent = [...selectedDay.events]
            .sort((a, b) => (b.formality_score || 0) - (a.formality_score || 0))[0];

        if (topEvent) {
            await calendarOutfitService.scheduleOutfitForEvent(topEvent.id, undefined, suggestion.items);
        } else {
            await calendarOutfitService.scheduleOutfit(selectedDay.date, undefined, suggestion.items);
        }

        setIsScheduling(false);
        setSuggestion(null);
        await loadData();
    };

    const handlePickOutfit = async (outfit: Outfit) => {
        if (!selectedDay) return;
        setShowOutfitPicker(false);
        setIsScheduling(true);

        const itemIds = outfit.outfit_items?.map((oi: any) => oi.item_id) || [];

        const topEvent = [...selectedDay.events]
            .sort((a, b) => (b.formality_score || 0) - (a.formality_score || 0))[0];

        if (topEvent) {
            await calendarOutfitService.scheduleOutfitForEvent(topEvent.id, outfit.id, itemIds);
        } else {
            await calendarOutfitService.scheduleOutfit(selectedDay.date, outfit.id, itemIds);
        }

        setIsScheduling(false);
        await loadData();
    };

    const handleRemoveOutfit = async () => {
        if (!selectedDay?.scheduledOutfit) return;
        setIsScheduling(true);
        await calendarOutfitService.removeScheduledOutfit(selectedDay.scheduledOutfit.id);
        setIsScheduling(false);
        await loadData();
    };

    // Get item details for thumbnails
    const getItemsForOutfit = (outfit: CalendarOutfitRow): WardrobeItem[] => {
        if (!outfit.item_ids) return [];
        return outfit.item_ids
            .map(id => wardrobeItems.find(w => w.id === id))
            .filter(Boolean) as WardrobeItem[];
    };

    const suggestionItems = suggestion
        ? suggestion.items.map(id => wardrobeItems.find(w => w.id === id)).filter(Boolean) as WardrobeItem[]
        : [];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Plan Your Week</Text>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : (
                <>
                    {/* Week strip */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.weekStrip}
                        contentContainerStyle={styles.weekStripContent}
                    >
                        {days.map(day => (
                            <TouchableOpacity
                                key={day.date}
                                style={[
                                    styles.dayCell,
                                    day.isToday && styles.dayCellToday,
                                    selectedDay?.date === day.date && styles.dayCellSelected,
                                ]}
                                onPress={() => handleSelectDay(day)}
                            >
                                <Text style={[
                                    styles.dayLabel,
                                    selectedDay?.date === day.date && styles.dayLabelSelected,
                                ]}>
                                    {day.label}
                                </Text>

                                {/* Weather */}
                                {day.forecast ? (
                                    <View style={styles.weatherChip}>
                                        <Ionicons
                                            name={getWeatherIcon(day.forecast.condition) as any}
                                            size={14}
                                            color="#6b7280"
                                        />
                                        <Text style={styles.weatherTemp}>{day.forecast.tempHigh}°</Text>
                                    </View>
                                ) : weather ? (
                                    <View style={styles.weatherChip}>
                                        <Ionicons name="sunny-outline" size={14} color="#6b7280" />
                                        <Text style={styles.weatherTemp}>{Math.round(weather.temperature)}°</Text>
                                    </View>
                                ) : null}

                                {/* Event count */}
                                {day.events.length > 0 && (
                                    <Text style={styles.eventCount}>
                                        {day.events.length} event{day.events.length !== 1 ? 's' : ''}
                                    </Text>
                                )}

                                {/* Outfit indicator */}
                                {day.scheduledOutfit ? (
                                    <View style={styles.outfitIndicator}>
                                        <Ionicons name="checkmark-circle" size={18} color="#7D9A78" />
                                    </View>
                                ) : (
                                    <View style={styles.outfitIndicator}>
                                        <Ionicons name="add-circle-outline" size={18} color="#d1d5db" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Day detail */}
                    {selectedDay && (
                        <ScrollView
                            style={styles.dayDetail}
                            contentContainerStyle={styles.dayDetailContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={styles.dayDetailTitle}>{selectedDay.dayName}</Text>

                            {/* Events for day */}
                            {selectedDay.events.length > 0 ? (
                                <View style={styles.eventsSection}>
                                    <Text style={styles.sectionLabel}>Events</Text>
                                    {selectedDay.events.map(event => (
                                        <View key={event.id} style={styles.miniEvent}>
                                            <Ionicons
                                                name="calendar-outline"
                                                size={16}
                                                color="#5D4E37"
                                            />
                                            <View style={styles.miniEventText}>
                                                <Text style={styles.miniEventTitle}>{event.title}</Text>
                                                <Text style={styles.miniEventTime}>
                                                    {event.is_all_day
                                                        ? 'All day'
                                                        : new Date(event.start_time).toLocaleTimeString('en-US', {
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                            hour12: true,
                                                        })}
                                                    {event.event_type ? ` · ${event.event_type}` : ''}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.noEventsCard}>
                                    <Text style={styles.noEventsText}>No events scheduled</Text>
                                </View>
                            )}

                            {/* Scheduled outfit */}
                            {selectedDay.scheduledOutfit ? (
                                <View style={styles.scheduledSection}>
                                    <Text style={styles.sectionLabel}>Planned Outfit</Text>
                                    <View style={styles.outfitCard}>
                                        <View style={styles.outfitItemGrid}>
                                            {getItemsForOutfit(selectedDay.scheduledOutfit).slice(0, 4).map(item => (
                                                <View key={item.id} style={styles.itemThumb}>
                                                    {item.image_url ? (
                                                        <Image
                                                            source={{ uri: item.image_url }}
                                                            style={styles.itemImage}
                                                        />
                                                    ) : (
                                                        <View style={styles.itemPlaceholder}>
                                                            <Ionicons name="shirt-outline" size={18} color="#9ca3af" />
                                                        </View>
                                                    )}
                                                </View>
                                            ))}
                                        </View>
                                        <View style={styles.outfitActions}>
                                            <TouchableOpacity
                                                style={styles.changeBtn}
                                                onPress={() => setShowOutfitPicker(true)}
                                            >
                                                <Ionicons name="swap-horizontal-outline" size={16} color="#6366f1" />
                                                <Text style={styles.changeBtnText}>Change</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.removeBtn}
                                                onPress={handleRemoveOutfit}
                                                disabled={isScheduling}
                                            >
                                                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                                <Text style={styles.removeBtnText}>Remove</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.planSection}>
                                    <Text style={styles.sectionLabel}>Plan Outfit</Text>

                                    {/* AI suggestion */}
                                    {suggestion ? (
                                        <View style={styles.suggestionCard}>
                                            <Text style={styles.suggestionName}>{suggestion.name}</Text>
                                            <View style={styles.outfitItemGrid}>
                                                {suggestionItems.slice(0, 4).map(item => (
                                                    <View key={item.id} style={styles.itemThumb}>
                                                        {item.image_url ? (
                                                            <Image
                                                                source={{ uri: item.image_url }}
                                                                style={styles.itemImage}
                                                            />
                                                        ) : (
                                                            <View style={styles.itemPlaceholder}>
                                                                <Ionicons name="shirt-outline" size={18} color="#9ca3af" />
                                                            </View>
                                                        )}
                                                    </View>
                                                ))}
                                            </View>
                                            <Text style={styles.rationaleText}>{suggestion.rationale}</Text>
                                            <TouchableOpacity
                                                style={styles.scheduleBtn}
                                                onPress={handleScheduleSuggestion}
                                                disabled={isScheduling}
                                            >
                                                {isScheduling ? (
                                                    <ActivityIndicator size="small" color="#fff" />
                                                ) : (
                                                    <>
                                                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                                                        <Text style={styles.scheduleBtnText}>Schedule This</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={styles.suggestBtn}
                                            onPress={handleGenerateSuggestion}
                                            disabled={isSuggesting}
                                        >
                                            {isSuggesting ? (
                                                <ActivityIndicator size="small" color="#6366f1" />
                                            ) : (
                                                <>
                                                    <Ionicons name="sparkles-outline" size={18} color="#6366f1" />
                                                    <Text style={styles.suggestBtnText}>Get AI Suggestion</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    )}

                                    {/* Browse saved outfits */}
                                    <TouchableOpacity
                                        style={styles.browseBtn}
                                        onPress={() => setShowOutfitPicker(true)}
                                    >
                                        <Ionicons name="albums-outline" size={18} color="#5D4E37" />
                                        <Text style={styles.browseBtnText}>Browse Saved Outfits</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    )}
                </>
            )}

            {/* Outfit picker modal */}
            <Modal
                visible={showOutfitPicker}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowOutfitPicker(false)}
            >
                <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                        <Text style={styles.pickerTitle}>Choose Outfit</Text>
                        <TouchableOpacity onPress={() => setShowOutfitPicker(false)}>
                            <Ionicons name="close" size={24} color="#1f2937" />
                        </TouchableOpacity>
                    </View>

                    {savedOutfits.length === 0 ? (
                        <View style={styles.emptyPicker}>
                            <Ionicons name="layers-outline" size={48} color="#d1d5db" />
                            <Text style={styles.emptyPickerTitle}>No saved outfits</Text>
                            <Text style={styles.emptyPickerText}>
                                Create outfits in the Outfits tab first.
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={savedOutfits}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.pickerList}
                            renderItem={({ item: outfit }) => (
                                <TouchableOpacity
                                    style={styles.pickerOutfit}
                                    onPress={() => handlePickOutfit(outfit)}
                                >
                                    <View style={styles.pickerOutfitInfo}>
                                        <Text style={styles.pickerOutfitName}>
                                            {outfit.name || 'Untitled Outfit'}
                                        </Text>
                                        {outfit.occasion && (
                                            <Text style={styles.pickerOutfitOccasion}>
                                                {outfit.occasion}
                                            </Text>
                                        )}
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            </Modal>
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

    // Week strip
    weekStrip: {
        maxHeight: 140,
    },
    weekStripContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    dayCell: {
        width: 80,
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 10,
        alignItems: 'center',
        gap: 6,
    },
    dayCellToday: {
        borderWidth: 2,
        borderColor: '#6366f1',
    },
    dayCellSelected: {
        backgroundColor: '#eef2ff',
    },
    dayLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1f2937',
    },
    dayLabelSelected: {
        color: '#6366f1',
    },
    weatherChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    weatherTemp: {
        fontSize: 12,
        color: '#6b7280',
    },
    eventCount: {
        fontSize: 11,
        color: '#6b7280',
    },
    outfitIndicator: {
        marginTop: 2,
    },

    // Day detail
    dayDetail: {
        flex: 1,
    },
    dayDetailContent: {
        padding: 16,
        paddingBottom: 40,
    },
    dayDetailTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 16,
    },

    // Events section
    eventsSection: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#5D4E37',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    miniEvent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        marginBottom: 6,
    },
    miniEventText: {
        flex: 1,
    },
    miniEventTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1f2937',
    },
    miniEventTime: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    noEventsCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    noEventsText: {
        fontSize: 13,
        color: '#9ca3af',
    },

    // Scheduled outfit
    scheduledSection: {
        marginBottom: 20,
    },
    outfitCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
    },
    outfitItemGrid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
    itemThumb: {
        width: 52,
        height: 52,
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
    outfitActions: {
        flexDirection: 'row',
        gap: 10,
    },
    changeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#eef2ff',
    },
    changeBtnText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6366f1',
    },
    removeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#fef2f2',
    },
    removeBtnText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#ef4444',
    },

    // Plan section
    planSection: {
        gap: 10,
    },
    suggestBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#eef2ff',
        borderRadius: 12,
        paddingVertical: 14,
    },
    suggestBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6366f1',
    },
    browseBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 14,
    },
    browseBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#5D4E37',
    },

    // Suggestion card
    suggestionCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
    },
    suggestionName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 10,
    },
    rationaleText: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
        marginBottom: 12,
    },
    scheduleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#5D4E37',
        borderRadius: 10,
        paddingVertical: 12,
    },
    scheduleBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },

    // Outfit picker modal
    pickerContainer: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    pickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 16,
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    pickerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1f2937',
    },
    pickerList: {
        padding: 16,
        gap: 8,
    },
    pickerOutfit: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
    },
    pickerOutfitInfo: {
        flex: 1,
    },
    pickerOutfitName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1f2937',
    },
    pickerOutfitOccasion: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
    },
    emptyPicker: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyPickerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
    },
    emptyPickerText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 8,
    },
});
