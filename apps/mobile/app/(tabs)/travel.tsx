/**
 * Travel Mode Screen
 * Trip detection, packing list generation, checklist, and export
 * Story 12.6: Travel Mode Packing Suggestions
 */

import { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Share, Platform, Image, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { manualTripService } from '../../services/manualTripService';
import { tripPackingService } from '../../services/tripPackingService';
import { tripWeatherService } from '../../services/tripWeatherService';
import { tripAnalyticsService } from '../../services/tripAnalyticsService';
import { itemsService, WardrobeItem } from '../../services/items';
import { TripEvent, ManualTripEvent, TripType, PackingList, TRIP_TYPE_LABELS, TRIP_TYPE_ICONS, DailyWeatherForecast } from '../../types/packingList';
import { OccasionType } from '../../utils/occasionDetector';
import { Text } from '../../components/ui/Typography';

export default function TravelScreen() {
    const router = useRouter();
    const [trips, setTrips] = useState<TripEvent[]>([]);
    const [selectedTrip, setSelectedTrip] = useState<TripEvent | null>(null);
    const [packingList, setPackingList] = useState<PackingList | null>(null);
    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

    const { showCreate, tripId } = useLocalSearchParams<{ showCreate?: string; tripId?: string }>();
    const [showModal, setShowModal] = useState(false);
    const [editingTrip, setEditingTrip] = useState<ManualTripEvent | null>(null);
    const [showCreateHandled, setShowCreateHandled] = useState(false);

    // Form state
    const [formDestination, setFormDestination] = useState('');
    const [formStartDate, setFormStartDate] = useState('');
    const [formEndDate, setFormEndDate] = useState('');
    const [formTripType, setFormTripType] = useState<TripType>('vacation');
    const [formError, setFormError] = useState('');
    const [weatherNote, setWeatherNote] = useState('');

    // Date picker state
    const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);

        const [allTrips, itemsResult] = await Promise.all([
            manualTripService.getAllTrips(),
            itemsService.getItems(),
        ]);

        setTrips(allTrips);
        setWardrobeItems(itemsResult.items || []);

        if (allTrips.length > 0) {
            const target = tripId
                ? allTrips.find(t => t.id === tripId) || allTrips[0]
                : allTrips[0];
            setSelectedTrip(target);

            const cached = await tripPackingService.getPackingList(target.id);
            if (cached) setPackingList(cached);
        }

        setIsLoading(false);
    }, [tripId]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    // Auto-open creation modal if navigated with showCreate param (once only)
    useFocusEffect(
        useCallback(() => {
            if (showCreate === 'true' && !showCreateHandled) {
                setShowCreateHandled(true);
                openCreateModal();
            }
        }, [showCreate, showCreateHandled])
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
        setWeatherNote('');

        let weatherForecasts: DailyWeatherForecast[] | undefined;
        let defaultOccasion: OccasionType | undefined;

        if ('isManual' in selectedTrip && (selectedTrip as ManualTripEvent).isManual) {
            const manual = selectedTrip as ManualTripEvent;
            defaultOccasion = manualTripService.tripTypeToOccasion(manual.tripType);
        }

        if (selectedTrip.location) {
            const geo = await tripWeatherService.geocodeDestination(selectedTrip.location);
            if (geo) {
                weatherForecasts = await tripWeatherService.getTripForecast(
                    geo.lat, geo.lon, selectedTrip.startDate, selectedTrip.endDate
                );
            } else {
                setWeatherNote(`Couldn't find weather for ${selectedTrip.location}`);
            }
        }

        const { list } = await tripPackingService.generatePackingList(
            selectedTrip,
            wardrobeItems,
            { defaultOccasion, weatherForecasts }
        );
        setPackingList(list);
        setIsGenerating(false);

        if (list) {
            await tripAnalyticsService.logTripEvent('packing_list_generated', {
                tripId: selectedTrip.id,
                itemCount: list.items.length,
                durationDays: selectedTrip.durationDays,
                hasWeather: !!weatherForecasts?.length,
            });
        }
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

        await tripAnalyticsService.logTripEvent('packing_item_toggled', {
            tripId: selectedTrip.id,
            packed: !item.packed,
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
        if (!packingList || !selectedTrip) return;
        const text = tripPackingService.exportPackingList(packingList);
        await Share.share({ message: text });
        await tripAnalyticsService.logTripEvent('packing_list_exported', {
            tripId: selectedTrip.id,
            itemCount: packingList.items.length,
            packedCount: packingList.items.filter(i => i.packed).length,
        });
    };

    const handleRegenerate = async () => {
        if (!selectedTrip) return;
        setPackingList(null);
        await handleGenerate();
    };

    const TRIP_TYPES: TripType[] = ['vacation', 'business', 'city_break', 'adventure', 'beach', 'conference'];

    const openCreateModal = () => {
        setEditingTrip(null);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const defaultEnd = new Date(tomorrow);
        defaultEnd.setDate(defaultEnd.getDate() + 3);

        setFormDestination('');
        setFormStartDate(tomorrow.toISOString().split('T')[0]);
        setFormEndDate(defaultEnd.toISOString().split('T')[0]);
        setFormTripType('vacation');
        setFormError('');
        setShowModal(true);
    };

    const openEditModal = (trip: ManualTripEvent) => {
        setEditingTrip(trip);
        setFormDestination(trip.location);
        setFormStartDate(trip.startDate);
        setFormEndDate(trip.endDate);
        setFormTripType(trip.tripType);
        setFormError('');
        setShowModal(true);
    };

    const handleSaveTrip = async () => {
        if (!formDestination.trim()) {
            setFormError('Please enter a destination');
            return;
        }
        if (formEndDate < formStartDate) {
            setFormError('End date must be after start date');
            return;
        }
        const duration = manualTripService.computeDuration(formStartDate, formEndDate);
        if (duration > 30) {
            setFormError('Trip cannot exceed 30 days');
            return;
        }

        if (editingTrip) {
            const updated: ManualTripEvent = {
                ...editingTrip,
                location: formDestination.trim(),
                startDate: formStartDate,
                endDate: formEndDate,
                tripType: formTripType,
            };
            await manualTripService.updateManualTrip(updated);
        } else {
            const trip = await manualTripService.saveManualTrip({
                destination: formDestination.trim(),
                startDate: formStartDate,
                endDate: formEndDate,
                tripType: formTripType,
            });
            await tripAnalyticsService.logTripEvent('trip_created', {
                tripType: formTripType,
                destination: formDestination.trim(),
                durationDays: trip.durationDays,
                source: 'manual',
            });
        }

        setShowModal(false);
        loadData();
    };

    const handleDeleteTrip = (trip: TripEvent) => {
        if (!('isManual' in trip)) return;
        Alert.alert(
            'Delete Trip',
            `Delete "${trip.title}"? This will also remove the packing list.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await manualTripService.deleteManualTrip(trip.id);
                        if (selectedTrip?.id === trip.id) {
                            setSelectedTrip(null);
                            setPackingList(null);
                        }
                        loadData();
                    },
                },
            ]
        );
    };

    const renderTripForm = () => (
        <View style={styles.formContainer}>
            <Text style={styles.formLabel}>Destination</Text>
            <TextInput
                style={styles.formInput}
                placeholder="Where are you going?"
                placeholderTextColor="#9ca3af"
                value={formDestination}
                onChangeText={setFormDestination}
            />

            <View style={styles.formRow}>
                <View style={styles.formHalf}>
                    <Text style={styles.formLabel}>Start Date</Text>
                    <TouchableOpacity style={styles.formDateBtn} onPress={() => setShowDatePicker('start')}>
                        <Text style={styles.formDateText}>{formStartDate}</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.formHalf}>
                    <Text style={styles.formLabel}>End Date</Text>
                    <TouchableOpacity style={styles.formDateBtn} onPress={() => setShowDatePicker('end')}>
                        <Text style={styles.formDateText}>{formEndDate}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={new Date(showDatePicker === 'start' ? formStartDate : formEndDate)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={showDatePicker === 'end' ? new Date(formStartDate) : new Date()}
                    onChange={(event: DateTimePickerEvent, date?: Date) => {
                        if (Platform.OS === 'android') setShowDatePicker(null);
                        if (event.type === 'dismissed') { setShowDatePicker(null); return; }
                        if (!date) return;
                        const dateStr = date.toISOString().split('T')[0];
                        if (showDatePicker === 'start') {
                            setFormStartDate(dateStr);
                            if (formEndDate < dateStr) {
                                const newEnd = new Date(date);
                                newEnd.setDate(newEnd.getDate() + 3);
                                setFormEndDate(newEnd.toISOString().split('T')[0]);
                            }
                        } else {
                            setFormEndDate(dateStr);
                        }
                        if (Platform.OS === 'ios') setShowDatePicker(null);
                    }}
                />
            )}

            <Text style={styles.formLabel}>Trip Type</Text>
            <View style={styles.chipRow}>
                {TRIP_TYPES.map(type => (
                    <TouchableOpacity
                        key={type}
                        style={[styles.chip, formTripType === type && styles.chipSelected]}
                        onPress={() => setFormTripType(type)}
                    >
                        <Ionicons
                            name={TRIP_TYPE_ICONS[type] as any}
                            size={14}
                            color={formTripType === type ? '#fff' : '#5D4E37'}
                        />
                        <Text style={[styles.chipText, formTripType === type && styles.chipTextSelected]}>
                            {TRIP_TYPE_LABELS[type]}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <TouchableOpacity style={styles.createBtn} onPress={handleSaveTrip}>
                <Text style={styles.createBtnText}>
                    {editingTrip ? 'Save Changes' : 'Create Trip'}
                </Text>
            </TouchableOpacity>
        </View>
    );

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
                    <ActivityIndicator size="large" color="#87A96B" />
                </View>
            ) : trips.length === 0 ? (
                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.emptyContainer}>
                        <Ionicons name="airplane-outline" size={48} color="#d1d5db" />
                        <Text style={styles.emptyTitle}>Plan a Trip</Text>
                        <Text style={styles.emptyText}>
                            Tell us where you're going and we'll help you pack.
                        </Text>
                    </View>
                    {renderTripForm()}
                </ScrollView>
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
                        <TouchableOpacity
                            style={styles.tripCard}
                            onPress={() => {
                                if ('isManual' in selectedTrip && (selectedTrip as ManualTripEvent).isManual) {
                                    openEditModal(selectedTrip as ManualTripEvent);
                                }
                            }}
                            onLongPress={() => handleDeleteTrip(selectedTrip)}
                            activeOpacity={'isManual' in selectedTrip ? 0.7 : 1}
                        >
                            <Ionicons name="airplane" size={20} color="#87A96B" />
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
                            {'isManual' in selectedTrip && (
                                <Ionicons name="pencil-outline" size={16} color="#9ca3af" />
                            )}
                        </TouchableOpacity>
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

                    {weatherNote ? (
                        <Text style={styles.weatherNote}>{weatherNote}</Text>
                    ) : null}

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
                                    <Ionicons name="refresh-outline" size={16} color="#87A96B" />
                                    <Text style={styles.regenerateBtnText}>Regenerate</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </ScrollView>
            )}

            {/* FAB for creating new trip */}
            {trips.length > 0 && (
                <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
                    <Ionicons name="add" size={28} color="#fff" />
                </TouchableOpacity>
            )}

            {/* Creation/Edit Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingTrip ? 'Edit Trip' : 'Plan a Trip'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Ionicons name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                        {renderTripForm()}
                    </View>
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
        backgroundColor: '#F4E2D6',
    },
    tripChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
    },
    tripChipTextSelected: {
        color: '#87A96B',
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
        backgroundColor: '#F4E2D6',
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
        color: '#87A96B',
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
        color: '#87A96B',
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
        backgroundColor: '#F4E2D6',
        borderRadius: 10,
        paddingVertical: 12,
    },
    regenerateBtnText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#87A96B',
    },

    // Form
    formContainer: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginTop: 16,
    },
    formLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#5D4E37',
        marginBottom: 6,
        marginTop: 12,
    },
    formInput: {
        backgroundColor: '#f9fafb',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1f2937',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    formRow: {
        flexDirection: 'row',
        gap: 12,
    },
    formHalf: {
        flex: 1,
    },
    formDateBtn: {
        backgroundColor: '#f9fafb',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    formDateText: {
        fontSize: 14,
        color: '#1f2937',
    },
    formError: {
        fontSize: 13,
        color: '#ef4444',
        marginTop: 8,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#f3f4f6',
    },
    chipSelected: {
        backgroundColor: '#5D4E37',
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#5D4E37',
    },
    chipTextSelected: {
        color: '#fff',
    },
    createBtn: {
        backgroundColor: '#5D4E37',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    createBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#5D4E37',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#F5F0E8',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    weatherNote: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
        marginBottom: 8,
    },
});
