/**
 * Log Wear Screen
 * Story 5.1: Allows users to log which items they wore today
 * Two modes: select individual items or log a saved outfit
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
    Dimensions,
    Animated,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { itemsService, WardrobeItem } from '../../services/items';
import { wearLogService } from '../../services/wearLogService';
import { gamificationService } from '../../services/gamificationService';
import { useOutfitStore } from '../../stores/outfitStore';
import { useWeatherStore } from '../../stores/weatherStore';
import { Outfit } from '../../types/outfit';
import { BadgeDefinition } from '@vestiaire/shared';
import BadgeUnlockModal from '../../components/gamification/BadgeUnlockModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SIZE = (SCREEN_WIDTH - 60) / 3;

type TabMode = 'items' | 'outfit';

const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'tops', label: 'Tops' },
    { id: 'bottoms', label: 'Bottoms' },
    { id: 'dresses', label: 'Dresses' },
    { id: 'outerwear', label: 'Outerwear' },
    { id: 'shoes', label: 'Shoes' },
    { id: 'accessories', label: 'Accessories' },
];

export default function LogWearScreen() {
    const router = useRouter();
    const { outfits, fetchOutfits } = useOutfitStore();
    const { weather } = useWeatherStore();

    const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
    const [tabMode, setTabMode] = useState<TabMode>('items');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [isLogging, setIsLogging] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [alreadyWornIds, setAlreadyWornIds] = useState<string[]>([]);
    const [showBadgeUnlock, setShowBadgeUnlock] = useState(false);
    const [unlockedBadge, setUnlockedBadge] = useState<BadgeDefinition | null>(null);
    const [pendingBadges, setPendingBadges] = useState<BadgeDefinition[]>([]);

    // Animation refs
    const successScale = useRef(new Animated.Value(0)).current;
    const successOpacity = useRef(new Animated.Value(0)).current;

    // Load wardrobe items, outfits, and already-worn items
    useFocusEffect(
        useCallback(() => {
            const init = async () => {
                setIsLoading(true);
                try {
                    const [itemsResult, wornResult] = await Promise.all([
                        itemsService.getItems(),
                        wearLogService.getItemsWornToday(),
                    ]);
                    setWardrobeItems(itemsResult.items.filter(i => i.status === 'complete'));
                    setAlreadyWornIds(wornResult.itemIds);
                    fetchOutfits({ refresh: true });
                } catch (error) {
                    console.error('Failed to load data:', error);
                } finally {
                    setIsLoading(false);
                }
            };
            init();

            // Reset selection when screen comes into focus
            setSelectedItemIds(new Set());
            setSelectedOutfitId(null);
        }, [])
    );

    // Filter items by category
    const filteredItems = wardrobeItems.filter(item => {
        if (selectedCategory === 'all') return true;
        return item.category?.toLowerCase() === selectedCategory;
    });

    // Toggle item selection
    const toggleItem = useCallback((itemId: string) => {
        setSelectedItemIds(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
        // Clear outfit selection when manually selecting items
        setSelectedOutfitId(null);
    }, []);

    // Select an outfit
    const selectOutfit = useCallback((outfit: Outfit) => {
        setSelectedOutfitId(prev => {
            if (prev === outfit.id) {
                setSelectedItemIds(new Set());
                return null;
            } else {
                // Auto-select all items in the outfit
                const itemIds = new Set(
                    outfit.items?.map(oi => oi.item_id) || []
                );
                setSelectedItemIds(itemIds);
                return outfit.id;
            }
        });
    }, []);

    // Play success animation
    const playSuccessAnimation = () => {
        setShowSuccess(true);
        successScale.setValue(0);
        successOpacity.setValue(1);

        Animated.sequence([
            Animated.spring(successScale, {
                toValue: 1,
                friction: 4,
                tension: 100,
                useNativeDriver: true,
            }),
            Animated.delay(1200),
            Animated.timing(successOpacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setShowSuccess(false);
            router.push('/(tabs)');
        });
    };

    const handleBadgeDismiss = () => {
        setShowBadgeUnlock(false);
        setUnlockedBadge(null);
        if (pendingBadges.length > 0) {
            const [next, ...rest] = pendingBadges;
            setPendingBadges(rest);
            setUnlockedBadge(next);
            setShowBadgeUnlock(true);
        } else {
            playSuccessAnimation();
        }
    };

    // Log the wear
    const handleLogWear = async () => {
        if (selectedItemIds.size === 0) return;

        setIsLogging(true);
        try {
            const itemIds = Array.from(selectedItemIds);
            const { error } = await wearLogService.logWear(
                itemIds,
                selectedOutfitId || undefined
            );

            if (error) {
                Alert.alert('Error', 'Failed to log wear. Please try again.');
            } else {
                // Award style points (fire-and-forget)
                gamificationService.awardWearLog().catch(() => {});

                // Check badges (wear_log + streak triggers)
                const newBadges = await gamificationService.checkBadges('wear_log', {
                    itemIds,
                    outfitId: selectedOutfitId || undefined,
                    weatherCondition: weather?.condition,
                }).catch(() => [] as BadgeDefinition[]);

                // Also check streak badges
                const streakBadges = await gamificationService.checkBadges('streak').catch(() => [] as BadgeDefinition[]);
                const allNewBadges = [...(newBadges || []), ...(streakBadges || [])];

                if (allNewBadges.length > 0) {
                    setUnlockedBadge(allNewBadges[0]);
                    setPendingBadges(allNewBadges.slice(1));
                    setShowBadgeUnlock(true);
                } else {
                    playSuccessAnimation();
                }
            }
        } catch (error) {
            console.error('Log wear error:', error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setIsLogging(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#5D4E37" />
                <Text style={styles.loadingText}>Loading wardrobe...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)')}>
                    <Ionicons name="close" size={28} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Log Today's Outfit</Text>
                <View style={{ width: 44 }} />
            </View>

            {/* Tab Selector */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, tabMode === 'items' && styles.tabActive]}
                    onPress={() => setTabMode('items')}
                >
                    <Ionicons
                        name="grid-outline"
                        size={16}
                        color={tabMode === 'items' ? '#fff' : '#5D4E37'}
                    />
                    <Text style={[styles.tabText, tabMode === 'items' && styles.tabTextActive]}>
                        Select Items
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, tabMode === 'outfit' && styles.tabActive]}
                    onPress={() => setTabMode('outfit')}
                >
                    <Ionicons
                        name="layers-outline"
                        size={16}
                        color={tabMode === 'outfit' ? '#fff' : '#5D4E37'}
                    />
                    <Text style={[styles.tabText, tabMode === 'outfit' && styles.tabTextActive]}>
                        Log Saved Outfit
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Selected Count */}
            {selectedItemIds.size > 0 && (
                <View style={styles.selectionBar}>
                    <Ionicons name="checkmark-circle" size={18} color="#7D9A78" />
                    <Text style={styles.selectionText}>
                        {selectedItemIds.size} item{selectedItemIds.size !== 1 ? 's' : ''} selected
                    </Text>
                    <TouchableOpacity onPress={() => {
                        setSelectedItemIds(new Set());
                        setSelectedOutfitId(null);
                    }}>
                        <Text style={styles.clearText}>Clear</Text>
                    </TouchableOpacity>
                </View>
            )}

            {tabMode === 'items' ? (
                <>
                    {/* Category Filter */}
                    <View style={styles.categoryContainer}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.categoryScroll}
                        >
                            {CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryTab,
                                        selectedCategory === cat.id && styles.categoryTabSelected,
                                    ]}
                                    onPress={() => setSelectedCategory(cat.id)}
                                >
                                    <Text style={[
                                        styles.categoryTabText,
                                        selectedCategory === cat.id && styles.categoryTabTextSelected,
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Items Grid */}
                    <ScrollView
                        style={styles.itemsGrid}
                        contentContainerStyle={styles.itemsGridContent}
                    >
                        {filteredItems.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="shirt-outline" size={48} color="#d1d5db" />
                                <Text style={styles.emptyText}>No items in this category</Text>
                            </View>
                        ) : (
                            <View style={styles.gridContainer}>
                                {filteredItems.map(item => {
                                    const isSelected = selectedItemIds.has(item.id);
                                    const isAlreadyWorn = alreadyWornIds.includes(item.id);
                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={[
                                                styles.itemCard,
                                                isSelected && styles.itemCardSelected,
                                            ]}
                                            onPress={() => toggleItem(item.id)}
                                            activeOpacity={0.7}
                                        >
                                            <Image
                                                source={{ uri: item.processed_image_url || item.image_url }}
                                                style={styles.itemImage}
                                                resizeMode="cover"
                                            />
                                            {isSelected && (
                                                <View style={styles.selectedOverlay}>
                                                    <Ionicons name="checkmark-circle" size={28} color="#7D9A78" />
                                                </View>
                                            )}
                                            {isAlreadyWorn && !isSelected && (
                                                <View style={styles.wornBadge}>
                                                    <Text style={styles.wornBadgeText}>Worn</Text>
                                                </View>
                                            )}
                                            <Text style={styles.itemLabel} numberOfLines={1}>
                                                {item.sub_category || item.category || 'Item'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </ScrollView>
                </>
            ) : (
                /* Saved Outfits List */
                <ScrollView
                    style={styles.outfitsContainer}
                    contentContainerStyle={styles.outfitsContent}
                >
                    {outfits.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="layers-outline" size={48} color="#d1d5db" />
                            <Text style={styles.emptyText}>No saved outfits yet</Text>
                            <Text style={styles.emptySubtext}>
                                Create outfits in the Outfits tab first
                            </Text>
                        </View>
                    ) : (
                        outfits.map(outfit => {
                            const isSelected = selectedOutfitId === outfit.id;
                            const outfitItems = outfit.items || [];
                            return (
                                <TouchableOpacity
                                    key={outfit.id}
                                    style={[
                                        styles.outfitCard,
                                        isSelected && styles.outfitCardSelected,
                                    ]}
                                    onPress={() => selectOutfit(outfit)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.outfitHeader}>
                                        <View style={styles.outfitInfo}>
                                            <Text style={styles.outfitName} numberOfLines={1}>
                                                {outfit.name || 'Unnamed Outfit'}
                                            </Text>
                                            <View style={styles.outfitMeta}>
                                                {outfit.occasion && (
                                                    <View style={styles.outfitBadge}>
                                                        <Text style={styles.outfitBadgeText}>
                                                            {outfit.occasion}
                                                        </Text>
                                                    </View>
                                                )}
                                                <Text style={styles.outfitItemCount}>
                                                    {outfitItems.length} items
                                                </Text>
                                            </View>
                                        </View>
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={24} color="#7D9A78" />
                                        )}
                                    </View>
                                    {/* Item thumbnails */}
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.outfitThumbnails}
                                    >
                                        {outfitItems.map(oi => {
                                            const itemData = oi.item;
                                            if (!itemData) return null;
                                            return (
                                                <Image
                                                    key={oi.id}
                                                    source={{ uri: itemData.processed_image_url || itemData.image_url }}
                                                    style={styles.outfitThumbnail}
                                                    resizeMode="cover"
                                                />
                                            );
                                        })}
                                    </ScrollView>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            )}

            {/* Log Button */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[
                        styles.logButton,
                        selectedItemIds.size === 0 && styles.logButtonDisabled,
                    ]}
                    onPress={handleLogWear}
                    disabled={isLogging || selectedItemIds.size === 0}
                >
                    {isLogging ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-done" size={20} color="#fff" />
                            <Text style={styles.logButtonText}>
                                Log {selectedItemIds.size > 0
                                    ? `${selectedItemIds.size} Item${selectedItemIds.size !== 1 ? 's' : ''}`
                                    : 'Outfit'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Success Overlay */}
            {showSuccess && (
                <View style={styles.successOverlay}>
                    <Animated.View
                        style={[
                            styles.successContent,
                            {
                                transform: [{ scale: successScale }],
                                opacity: successOpacity,
                            },
                        ]}
                    >
                        <View style={styles.successIcon}>
                            <Ionicons name="checkmark-circle" size={64} color="#7D9A78" />
                        </View>
                        <Text style={styles.successTitle}>Logged!</Text>
                        <Text style={styles.successEmoji}>👗</Text>
                    </Animated.View>
                </View>
            )}

            <BadgeUnlockModal
                visible={showBadgeUnlock}
                badge={unlockedBadge}
                onDismiss={handleBadgeDismiss}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F0E8',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F0E8',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6b7280',
    },
    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    // Tabs
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: '#5D4E37',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#5D4E37',
    },
    tabTextActive: {
        color: '#fff',
    },
    // Selection Bar
    selectionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: '#f0fdf4',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    selectionText: {
        flex: 1,
        fontSize: 14,
        color: '#166534',
        fontWeight: '500',
    },
    clearText: {
        fontSize: 14,
        color: '#6366f1',
        fontWeight: '500',
    },
    // Category Filter
    categoryContainer: {
        height: 44,
        marginBottom: 8,
    },
    categoryScroll: {
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 8,
    },
    categoryTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        height: 36,
        justifyContent: 'center',
    },
    categoryTabSelected: {
        backgroundColor: '#5D4E37',
    },
    categoryTabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#5D4E37',
    },
    categoryTabTextSelected: {
        color: '#fff',
    },
    // Items Grid
    itemsGrid: {
        flex: 1,
    },
    itemsGridContent: {
        paddingHorizontal: 16,
        paddingBottom: 120,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    itemCard: {
        width: ITEM_SIZE,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    itemCardSelected: {
        borderColor: '#7D9A78',
    },
    itemImage: {
        width: '100%',
        height: ITEM_SIZE,
        backgroundColor: '#f9fafb',
    },
    selectedOverlay: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: '#fff',
        borderRadius: 14,
    },
    wornBadge: {
        position: 'absolute',
        top: 6,
        left: 6,
        backgroundColor: 'rgba(125, 154, 120, 0.85)',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    wornBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#fff',
    },
    itemLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: '#6b7280',
        textAlign: 'center',
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    // Outfits
    outfitsContainer: {
        flex: 1,
    },
    outfitsContent: {
        paddingHorizontal: 16,
        paddingBottom: 120,
    },
    outfitCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    outfitCardSelected: {
        borderColor: '#7D9A78',
    },
    outfitHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    outfitInfo: {
        flex: 1,
    },
    outfitName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    outfitMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    outfitBadge: {
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    outfitBadgeText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6b7280',
        textTransform: 'capitalize',
    },
    outfitItemCount: {
        fontSize: 12,
        color: '#9ca3af',
    },
    outfitThumbnails: {
        gap: 8,
    },
    outfitThumbnail: {
        width: 56,
        height: 56,
        borderRadius: 10,
        backgroundColor: '#f9fafb',
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        color: '#9ca3af',
        fontWeight: '500',
    },
    emptySubtext: {
        marginTop: 6,
        fontSize: 14,
        color: '#d1d5db',
    },
    // Bottom Bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        backgroundColor: '#F5F0E8',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    logButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#7D9A78',
        borderRadius: 14,
        paddingVertical: 16,
    },
    logButtonDisabled: {
        backgroundColor: '#d1d5db',
    },
    logButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    // Success Overlay
    successOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(245, 240, 232, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    successContent: {
        alignItems: 'center',
    },
    successIcon: {
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 8,
    },
    successEmoji: {
        fontSize: 48,
    },
});
